import { supabase } from '../supabase';

/**
 * Image processing utility for automatic image handling in blog posts
 * Downloads, optimizes, and uploads images to Supabase storage
 */

class ImageProcessor {
    constructor() {
        this.maxWidth = 1200;
        this.maxHeight = 800;
        this.quality = 0.8;
        this.bucketName = 'blog-images';
    }

    /**
     * Process an image URL: download, optimize, and upload to Supabase
     * @param {string} imageUrl - The original image URL
     * @param {string} postId - The blog post ID
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} - Object containing the new image URL and metadata
     */
    async processImageUrl(imageUrl, postId, userId) {
        try {
            console.log('Processing image URL:', imageUrl);
            
            // Download the image
            const imageBlob = await this.downloadImage(imageUrl);
            
            // Optimize the image
            const optimizedBlob = await this.optimizeImage(imageBlob);
            
            // Generate a unique filename
            const fileName = this.generateFileName(imageUrl);
            const filePath = `${userId}/${postId}/${fileName}`;
            
            // Upload to Supabase storage
            const uploadResult = await this.uploadToSupabase(optimizedBlob, filePath);
            
            // Get the public URL
            const publicUrl = this.getPublicUrl(filePath);
            
            // Save image metadata to database
            const imageMetadata = await this.saveImageMetadata({
                originalUrl: imageUrl,
                storagePath: filePath,
                publicUrl: publicUrl,
                fileName: fileName,
                fileSize: optimizedBlob.size,
                mimeType: optimizedBlob.type,
                postId: postId,
                uploadedBy: userId
            });
            
            return {
                success: true,
                originalUrl: imageUrl,
                newUrl: publicUrl,
                metadata: imageMetadata
            };
            
        } catch (error) {
            console.error('Error processing image:', error);
            return {
                success: false,
                error: error.message,
                originalUrl: imageUrl
            };
        }
    }

    /**
     * Download image from URL
     * @param {string} url - Image URL
     * @returns {Promise<Blob>} - Image blob
     */
    async downloadImage(url) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BlogImageProcessor/1.0)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('URL does not point to a valid image');
        }
        
        return await response.blob();
    }

    /**
     * Optimize image (resize and compress)
     * @param {Blob} imageBlob - Original image blob
     * @returns {Promise<Blob>} - Optimized image blob
     */
    async optimizeImage(imageBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                try {
                    // Calculate new dimensions
                    const { width, height } = this.calculateDimensions(
                        img.width, 
                        img.height, 
                        this.maxWidth, 
                        this.maxHeight
                    );
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob with compression
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to compress image'));
                            }
                        },
                        'image/jpeg',
                        this.quality
                    );
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image for optimization'));
            };
            
            img.src = URL.createObjectURL(imageBlob);
        });
    }

    /**
     * Calculate optimal dimensions while maintaining aspect ratio
     * @param {number} originalWidth 
     * @param {number} originalHeight 
     * @param {number} maxWidth 
     * @param {number} maxHeight 
     * @returns {Object} - New width and height
     */
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;
        
        // If image is smaller than max dimensions, keep original size
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }
        
        // Calculate scaling factor
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);
        
        return {
            width: Math.round(width * ratio),
            height: Math.round(height * ratio)
        };
    }

    /**
     * Generate a unique filename for the image
     * @param {string} originalUrl 
     * @returns {string} - Generated filename
     */
    generateFileName(originalUrl) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        
        // Try to extract original extension
        let extension = 'jpg';
        try {
            const urlPath = new URL(originalUrl).pathname;
            const match = urlPath.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            if (match) {
                extension = match[1].toLowerCase();
            }
        } catch (e) {
            // Use default extension if URL parsing fails
        }
        
        return `image_${timestamp}_${random}.${extension}`;
    }

    /**
     * Upload blob to Supabase storage
     * @param {Blob} blob - Image blob
     * @param {string} filePath - Storage path
     * @returns {Promise<Object>} - Upload result
     */
    async uploadToSupabase(blob, filePath) {
        const { data, error } = await supabase.storage
            .from(this.bucketName)
            .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }
        
        return data;
    }

    /**
     * Get public URL for uploaded image
     * @param {string} filePath - Storage path
     * @returns {string} - Public URL
     */
    getPublicUrl(filePath) {
        const { data } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(filePath);
        
        return data.publicUrl;
    }

    /**
     * Save image metadata to database
     * @param {Object} metadata - Image metadata
     * @returns {Promise<Object>} - Saved metadata
     */
    async saveImageMetadata(metadata) {
        const { data, error } = await supabase
            .from('blog_images')
            .insert([metadata])
            .select()
            .single();
        
        if (error) {
            console.error('Failed to save image metadata:', error);
            // Don't throw error here as the image is already uploaded
            return null;
        }
        
        return data;
    }

    /**
     * Process all image URLs in blog content
     * @param {string} content - Blog post content with image URLs
     * @param {string} postId - Blog post ID
     * @param {string} userId - User ID
     * @returns {Promise<string>} - Updated content with new image URLs
     */
    async processContentImages(content, postId, userId) {
        // Regular expression to find image URLs in content
        const imageUrlRegex = /(https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp))/gi;
        const imageUrls = content.match(imageUrlRegex) || [];
        
        if (imageUrls.length === 0) {
            return content;
        }
        
        console.log(`Found ${imageUrls.length} image URLs to process`);
        
        let updatedContent = content;
        
        // Process each image URL
        for (const imageUrl of imageUrls) {
            try {
                const result = await this.processImageUrl(imageUrl, postId, userId);
                
                if (result.success) {
                    // Replace the original URL with the new one
                    updatedContent = updatedContent.replace(
                        new RegExp(this.escapeRegExp(imageUrl), 'g'),
                        result.newUrl
                    );
                    console.log(`Processed image: ${imageUrl} -> ${result.newUrl}`);
                } else {
                    console.warn(`Failed to process image: ${imageUrl}`, result.error);
                }
            } catch (error) {
                console.error(`Error processing image ${imageUrl}:`, error);
            }
        }
        
        return updatedContent;
    }

    /**
     * Escape special characters for regex
     * @param {string} string 
     * @returns {string}
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Delete image from storage and database
     * @param {string} imageId - Image ID from database
     * @returns {Promise<boolean>} - Success status
     */
    async deleteImage(imageId) {
        try {
            // Get image metadata
            const { data: imageData, error: fetchError } = await supabase
                .from('blog_images')
                .select('storage_path')
                .eq('id', imageId)
                .single();
            
            if (fetchError || !imageData) {
                throw new Error('Image not found');
            }
            
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(this.bucketName)
                .remove([imageData.storage_path]);
            
            if (storageError) {
                console.error('Failed to delete from storage:', storageError);
            }
            
            // Delete from database
            const { error: dbError } = await supabase
                .from('blog_images')
                .delete()
                .eq('id', imageId);
            
            if (dbError) {
                throw new Error(`Failed to delete from database: ${dbError.message}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }
}

// Export singleton instance
export const imageProcessor = new ImageProcessor();
export default ImageProcessor;