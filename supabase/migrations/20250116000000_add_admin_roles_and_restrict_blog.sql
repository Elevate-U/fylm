-- Add admin role system and restrict blog post creation to admins only

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index for role column
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION is_admin_or_moderator(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing blog post policies
DROP POLICY IF EXISTS "Authenticated users can create posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON blog_categories;

-- New RLS policies for blog_posts - only admins can create/manage posts
CREATE POLICY "Only admins can create blog posts" ON blog_posts
    FOR INSERT WITH CHECK (is_admin(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Admins can update any post, authors can update own posts" ON blog_posts
    FOR UPDATE USING (
        is_admin(auth.uid()) OR 
        (auth.uid() = author_id AND is_admin_or_moderator(auth.uid()))
    );

CREATE POLICY "Admins can delete any post, authors can delete own posts" ON blog_posts
    FOR DELETE USING (
        is_admin(auth.uid()) OR 
        (auth.uid() = author_id AND is_admin_or_moderator(auth.uid()))
    );

-- New RLS policies for blog_categories - only admins can manage categories
CREATE POLICY "Only admins can manage categories" ON blog_categories
    FOR ALL USING (is_admin(auth.uid()));

-- Update blog image policies to only allow admins to upload
DROP POLICY IF EXISTS "Authenticated users can upload images" ON blog_images;
CREATE POLICY "Only admins can upload images" ON blog_images
    FOR INSERT WITH CHECK (is_admin(auth.uid()) AND auth.uid() = uploaded_by);

-- Update storage policies for blog images
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
CREATE POLICY "Only admins can upload blog images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'blog-images' 
        AND is_admin(auth.uid())
    );

-- Function to get all blog posts for admin (including drafts)
CREATE OR REPLACE FUNCTION get_all_blog_posts_admin(
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    filter_status TEXT DEFAULT NULL,
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
    status VARCHAR,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    view_count INTEGER,
    tags TEXT[]
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
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
        p.status,
        p.published_at,
        p.created_at,
        p.updated_at,
        p.read_time,
        p.view_count,
        p.tags
    FROM blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.id
    WHERE (filter_status IS NULL OR p.status = filter_status)
    AND (filter_category_slug IS NULL OR c.slug = filter_category_slug)
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blog post stats for admin
CREATE OR REPLACE FUNCTION get_blog_stats_admin()
RETURNS TABLE (
    total_posts BIGINT,
    published_posts BIGINT,
    draft_posts BIGINT,
    total_views BIGINT
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    RETURN QUERY
    SELECT
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE status = 'published') as published_posts,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_posts,
        COALESCE(SUM(view_count), 0) as total_views
    FROM blog_posts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_moderator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_blog_posts_admin(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_stats_admin() TO authenticated;

-- Comment explaining how to make a user admin
-- To make a user an admin, run this SQL in the Supabase SQL editor:
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';
-- Replace USER_UUID_HERE with the actual user UUID from auth.users table