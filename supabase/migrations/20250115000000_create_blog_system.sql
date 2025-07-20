-- Blog System Database Schema
-- This migration creates the complete blog system with posts, categories, and image storage

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#667eea', -- Hex color for category styling
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,
    category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    meta_title VARCHAR(255), -- SEO meta title
    meta_description TEXT, -- SEO meta description
    tags TEXT[], -- Array of tags
    read_time INTEGER DEFAULT 0, -- Estimated read time in minutes
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_images table for tracking uploaded images
CREATE TABLE IF NOT EXISTS blog_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_images_post ON blog_images(post_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_categories_updated_at BEFORE UPDATE ON blog_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO blog_categories (name, slug, description, color) VALUES
('Movies', 'movies', 'Latest movie reviews and news', '#e74c3c'),
('TV Shows', 'tv-shows', 'TV series reviews and recommendations', '#3498db'),
('Anime', 'anime', 'Anime reviews and industry news', '#9b59b6'),
('Industry News', 'industry-news', 'Entertainment industry updates', '#f39c12'),
('Guides', 'guides', 'How-to guides and tutorials', '#27ae60'),
('Reviews', 'reviews', 'In-depth reviews and analysis', '#34495e')
ON CONFLICT (slug) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_categories
-- Anyone can read categories
CREATE POLICY "Anyone can view blog categories" ON blog_categories
    FOR SELECT USING (true);

-- Only authenticated users can manage categories
CREATE POLICY "Authenticated users can manage categories" ON blog_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for blog_posts
-- Anyone can read published posts
CREATE POLICY "Anyone can view published blog posts" ON blog_posts
    FOR SELECT USING (status = 'published');

-- Authors can view their own posts
CREATE POLICY "Authors can view own posts" ON blog_posts
    FOR SELECT USING (auth.uid() = author_id);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts" ON blog_posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts" ON blog_posts
    FOR UPDATE USING (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own posts" ON blog_posts
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for blog_images
-- Anyone can view images from published posts
CREATE POLICY "Anyone can view published post images" ON blog_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE blog_posts.id = blog_images.post_id 
            AND blog_posts.status = 'published'
        )
    );

-- Authors can view images from their own posts
CREATE POLICY "Authors can view own post images" ON blog_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE blog_posts.id = blog_images.post_id 
            AND blog_posts.author_id = auth.uid()
        )
    );

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images" ON blog_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = uploaded_by);

-- Users can delete their own uploaded images
CREATE POLICY "Users can delete own images" ON blog_images
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'blog-images',
    'blog-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for blog images
CREATE POLICY "Anyone can view blog images" ON storage.objects
    FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'blog-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update own blog images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'blog-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own blog images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'blog-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Function to automatically generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate read time based on content
CREATE OR REPLACE FUNCTION calculate_read_time(content TEXT)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
    read_time INTEGER;
BEGIN
    -- Remove HTML tags and count words
    word_count := array_length(string_to_array(regexp_replace(content, '<[^>]*>', ' ', 'g'), ' '), 1);
    -- Average reading speed: 200 words per minute
    read_time := GREATEST(1, ROUND(word_count / 200.0));
    RETURN read_time;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug and calculate read time
CREATE OR REPLACE FUNCTION blog_post_before_insert_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug if not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.title);
    END IF;
    
    -- Ensure slug is unique
    WHILE EXISTS (SELECT 1 FROM blog_posts WHERE slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
        NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
    END LOOP;
    
    -- Calculate read time
    NEW.read_time := calculate_read_time(NEW.content);
    
    -- Set published_at when status changes to published
    IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
        NEW.published_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_post_before_insert_update_trigger
    BEFORE INSERT OR UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION blog_post_before_insert_update();

-- Function to get published blog posts with category info
CREATE OR REPLACE FUNCTION get_published_blog_posts(
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    filter_category_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    excerpt TEXT,
    featured_image_url TEXT,
    category_name VARCHAR,
    category_slug VARCHAR,
    category_color VARCHAR,
    author_id UUID,
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    view_count INTEGER,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.featured_image_url,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        p.author_id,
        p.published_at,
        p.read_time,
        p.view_count,
        p.tags
    FROM blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    AND (filter_category_slug IS NULL OR c.slug = filter_category_slug)
    ORDER BY p.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a single blog post by slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(post_slug TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    excerpt TEXT,
    content TEXT,
    featured_image_url TEXT,
    category_name VARCHAR,
    category_slug VARCHAR,
    category_color VARCHAR,
    author_id UUID,
    published_at TIMESTAMP WITH TIME ZONE,
    meta_title VARCHAR,
    meta_description TEXT,
    read_time INTEGER,
    view_count INTEGER,
    tags TEXT[]
) AS $$
BEGIN
    -- Increment view count
    UPDATE blog_posts SET view_count = blog_posts.view_count + 1 WHERE blog_posts.slug = post_slug AND status = 'published';
    
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.content,
        p.featured_image_url,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        p.author_id,
        p.published_at,
        p.meta_title,
        p.meta_description,
        p.read_time,
        p.view_count,
        p.tags
    FROM blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.id
    WHERE p.slug = post_slug AND p.status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;