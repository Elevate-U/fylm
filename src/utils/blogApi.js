import { supabase } from '../supabase';
import { imageProcessor } from './imageProcessor';

/**
 * Blog API utilities for handling blog posts, categories, and related operations
 */

export class BlogAPI {
    // Cache for admin status to avoid repeated API calls
    static _adminCache = new Map();
    static _cacheExpiry = 5 * 60 * 1000; // 5 minutes

    /**
     * Check if current user is an admin
     * @returns {Promise<boolean>} - Whether user is admin
     */
    static async isAdmin() {
        try {
            console.log('BlogAPI.isAdmin() called');
            const { data: user } = await supabase.auth.getUser();
            console.log('Current user in BlogAPI:', user);
            if (!user.user) {
                console.log('No user found');
                return false;
            }

            const userId = user.user.id;
            const now = Date.now();
            
            // Check cache first
            if (this._adminCache.has(userId)) {
                const cached = this._adminCache.get(userId);
                if (now - cached.timestamp < this._cacheExpiry) {
                    console.log('Returning cached admin status:', cached.isAdmin);
                    return cached.isAdmin;
                }
            }

            const { data, error } = await supabase
                .rpc('is_admin');

            console.log('is_admin RPC result:', { data, error });
            if (error) {
                console.error('Error checking admin status:', error);
                return false;
            }

            // Cache the result
            this._adminCache.set(userId, {
                isAdmin: data,
                timestamp: now
            });

            return data;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    /**
     * Clear admin cache (useful when user signs out or admin status changes)
     */
    static clearAdminCache() {
        this._adminCache.clear();
    }
    /**
     * Get all blog categories
     * @returns {Promise<Array>} - Array of categories
     */
    static async getCategories() {
        try {
            const { data, error } = await supabase
                .from('blog_categories')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Get published blog posts with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Posts data with pagination info
     */
    static async getPublishedPosts(options = {}) {
        const {
            limit = 10,
            offset = 0,
            categorySlug = null,
            searchTerm = null
        } = options;

        try {
            // Use the database function for better performance
            const { data, error } = await supabase
                .rpc('get_published_blog_posts', {
                    limit_count: limit,
                    offset_count: offset,
                    filter_category_slug: categorySlug
                });
            
            if (error) throw error;
            
            // If search term is provided, filter results
            let filteredData = data || [];
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                filteredData = data.filter(post => 
                    post.title.toLowerCase().includes(searchLower) ||
                    post.excerpt?.toLowerCase().includes(searchLower) ||
                    post.tags?.some(tag => tag.toLowerCase().includes(searchLower))
                );
            }
            
            return {
                posts: filteredData,
                hasMore: filteredData.length === limit,
                total: filteredData.length
            };
        } catch (error) {
            console.error('Error fetching published posts:', error);
            throw error;
        }
    }

    /**
     * Get a single blog post by slug
     * @param {string} slug - Post slug
     * @returns {Promise<Object>} - Blog post data
     */
    static async getPostBySlug(slug) {
        try {
            const { data, error } = await supabase
                .rpc('get_blog_post_by_slug', { post_slug: slug });
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error fetching post by slug:', error);
            throw error;
        }
    }

    /**
     * Get a blog post by ID (Admin only for unpublished posts)
     * @param {string} postId - Post ID
     * @returns {Promise<Object|null>} - Blog post or null
     */
    static async getPostById(postId) {
        try {
            if (!postId) {
                throw new Error('Post ID is required');
            }

            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            // Check if user is admin
            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can access posts by ID');
            }

            const { data, error } = await supabase
                .from('blog_posts')
                .select(`
                    *,
                    blog_categories(id, name, slug, color, description)
                `)
                .eq('id', postId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Post not found
                }
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching post by ID:', error);
            throw error;
        }
    }

    /**
     * Get user's blog posts (for admin/author view)
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - User's blog posts
     */
    static async getUserPosts(userId, options = {}) {
        const { status = null, limit = 20, offset = 0 } = options;
        
        try {
            let query = supabase
                .from('blog_posts')
                .select(`
                    *,
                    blog_categories(name, slug, color)
                `)
                .eq('author_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (status) {
                query = query.eq('status', status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching user posts:', error);
            throw error;
        }
    }

    /**
     * Create a new blog post (Admin only)
     * @param {Object} postData - Blog post data
     * @returns {Promise<Object>} - Created post
     */
    static async createPost(postData) {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            // Check if user is admin
            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can create blog posts');
            }

            // Process images in content if any
            let processedContent = postData.content;
            if (postData.content && postData.processImages !== false) {
                // Generate a temporary post ID for image processing
                const tempPostId = crypto.randomUUID();
                processedContent = await imageProcessor.processContentImages(
                    postData.content,
                    tempPostId,
                    user.user.id
                );
            }

            const postToInsert = {
                ...postData,
                content: processedContent,
                author_id: user.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('blog_posts')
                .insert([postToInsert])
                .select(`
                    *,
                    blog_categories(name, slug, color)
                `)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }

    /**
     * Update a blog post (Admin only)
     * @param {string} postId - Post ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} - Updated post
     */
    static async updatePost(postId, updateData) {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            // Check if user is admin
            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can update blog posts');
            }

            // Process images in content if content is being updated
            let processedContent = updateData.content;
            if (updateData.content && updateData.processImages !== false) {
                processedContent = await imageProcessor.processContentImages(
                    updateData.content,
                    postId,
                    user.user.id
                );
            }

            const dataToUpdate = {
                ...updateData,
                content: processedContent,
                updated_at: new Date().toISOString()
            };

            // Remove processImages flag from update data
            delete dataToUpdate.processImages;

            const { data, error } = await supabase
                .from('blog_posts')
                .update(dataToUpdate)
                .eq('id', postId)
                .select(`
                    *,
                    blog_categories(name, slug, color)
                `)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    /**
     * Delete a blog post (Admin only)
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} - Success status
     */
    static async deletePost(postId) {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            // Check if user is admin
            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can delete blog posts');
            }

            // Delete associated images first
            const { data: images } = await supabase
                .from('blog_images')
                .select('id')
                .eq('post_id', postId);

            if (images && images.length > 0) {
                for (const image of images) {
                    await imageProcessor.deleteImage(image.id);
                }
            }

            // Delete the post
            const { error } = await supabase
                .from('blog_posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }

    /**
     * Get related posts based on category and tags
     * @param {string} postId - Current post ID
     * @param {string} categoryId - Post category ID
     * @param {Array} tags - Post tags
     * @param {number} limit - Number of related posts to return
     * @returns {Promise<Array>} - Related posts
     */
    static async getRelatedPosts(postId, categoryId, tags = [], limit = 3) {
        try {
            let query = supabase
                .from('blog_posts')
                .select(`
                    id,
                    title,
                    slug,
                    excerpt,
                    featured_image_url,
                    published_at,
                    read_time,
                    blog_categories(name, slug, color)
                `)
                .eq('status', 'published')
                .neq('id', postId)
                .order('published_at', { ascending: false })
                .limit(limit);

            // Prefer posts from the same category
            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // If we don't have enough posts from the same category, get more from other categories
            if (data && data.length < limit) {
                const additionalNeeded = limit - data.length;
                const excludeIds = [postId, ...data.map(p => p.id)];

                const { data: additionalPosts } = await supabase
                    .from('blog_posts')
                    .select(`
                        id,
                        title,
                        slug,
                        excerpt,
                        featured_image_url,
                        published_at,
                        read_time,
                        blog_categories(name, slug, color)
                    `)
                    .eq('status', 'published')
                    .not('id', 'in', `(${excludeIds.join(',')})`)
                    .order('published_at', { ascending: false })
                    .limit(additionalNeeded);

                if (additionalPosts) {
                    data.push(...additionalPosts);
                }
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching related posts:', error);
            return [];
        }
    }

    /**
     * Search blog posts
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Search results
     */
    static async searchPosts(searchTerm, options = {}) {
        const { limit = 10, offset = 0, categorySlug = null } = options;
        
        try {
            let query = supabase
                .from('blog_posts')
                .select(`
                    id,
                    title,
                    slug,
                    excerpt,
                    featured_image_url,
                    published_at,
                    read_time,
                    tags,
                    blog_categories(name, slug, color)
                `)
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (categorySlug) {
                query = query.eq('blog_categories.slug', categorySlug);
            }

            // Use text search if available, otherwise filter on client side
            if (searchTerm) {
                query = query.or(`title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching posts:', error);
            throw error;
        }
    }

    /**
     * Get blog statistics (Admin only)
     * @returns {Promise<Object>} - Blog statistics
     */
    static async getBlogStats() {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            // Check if user is admin
            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can view blog statistics');
            }

            // Use the admin-specific function
            const { data, error } = await supabase
                .rpc('get_blog_stats_admin');

            if (error) throw error;
            return data || {
                totalPosts: 0,
                publishedPosts: 0,
                draftPosts: 0,
                totalViews: 0
            };
        } catch (error) {
            console.error('Error fetching blog stats:', error);
            throw error;
        }
    }

    /**
     * Generate slug from title
     * @param {string} title - Post title
     * @returns {string} - Generated slug
     */
    static generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim('-'); // Remove leading/trailing hyphens
    }

    /**
     * Check if slug is available
     * @param {string} slug - Slug to check
     * @param {string} excludePostId - Post ID to exclude from check
     * @returns {Promise<boolean>} - Whether slug is available
     */
    static async isSlugAvailable(slug, excludePostId = null) {
        try {
            let query = supabase
                .from('blog_posts')
                .select('id')
                .eq('slug', slug);

            if (excludePostId) {
                query = query.neq('id', excludePostId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return !data || data.length === 0;
        } catch (error) {
            console.error('Error checking slug availability:', error);
            return false;
        }
    }

    /**
     * Bulk update posts status (Admin only)
     * @param {Array} postIds - Array of post IDs
     * @param {string} status - New status
     * @returns {Promise<Array>} - Updated posts
     */
    static async bulkUpdateStatus(postIds, status) {
        try {
            if (!postIds || postIds.length === 0) {
                throw new Error('Post IDs are required');
            }

            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can bulk update posts');
            }

            const { data, error } = await supabase
                .from('blog_posts')
                .update({ 
                    status, 
                    updated_at: new Date().toISOString(),
                    published_at: status === 'published' ? new Date().toISOString() : null
                })
                .in('id', postIds)
                .select(`
                    *,
                    blog_categories(id, name, slug, color)
                `);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error bulk updating posts:', error);
            throw error;
        }
    }

    /**
     * Bulk delete posts (Admin only)
     * @param {Array} postIds - Array of post IDs
     * @returns {Promise<boolean>} - Success status
     */
    static async bulkDeletePosts(postIds) {
        try {
            if (!postIds || postIds.length === 0) {
                throw new Error('Post IDs are required');
            }

            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can bulk delete posts');
            }

            // Delete associated images for all posts
            const { data: images } = await supabase
                .from('blog_images')
                .select('id')
                .in('post_id', postIds);

            if (images && images.length > 0) {
                for (const image of images) {
                    await imageProcessor.deleteImage(image.id);
                }
            }

            // Delete the posts
            const { error } = await supabase
                .from('blog_posts')
                .delete()
                .in('id', postIds);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error bulk deleting posts:', error);
            throw error;
        }
    }

    /**
     * Increment post view count
     * @param {string} postId - Post ID
     * @returns {Promise<boolean>} - Success status
     */
    static async incrementViewCount(postId) {
        try {
            if (!postId) {
                throw new Error('Post ID is required');
            }

            const { error } = await supabase
                .from('blog_posts')
                .update({ 
                    views: supabase.raw('views + 1')
                })
                .eq('id', postId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error incrementing view count:', error);
            return false;
        }
    }

    /**
     * Get post analytics (Admin only)
     * @param {string} postId - Post ID
     * @returns {Promise<Object>} - Post analytics
     */
    static async getPostAnalytics(postId) {
        try {
            if (!postId) {
                throw new Error('Post ID is required');
            }

            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
                throw new Error('User not authenticated');
            }

            const isUserAdmin = await this.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Only administrators can view post analytics');
            }

            const { data, error } = await supabase
                .from('blog_posts')
                .select('id, title, views, created_at, published_at, status')
                .eq('id', postId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching post analytics:', error);
            throw error;
        }
    }
}

export default BlogAPI;