# Blog Feature Setup Guide

This guide will help you set up the complete blog feature for your movie streaming website.

## Prerequisites

- Supabase project set up
- Node.js 22.x or higher
- npm 10.0.0 or higher

## Database Setup

1. **Run the migration**:
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or manually run the SQL in supabase/migrations/20250115000000_create_blog_system.sql
   # in your Supabase dashboard SQL editor
   ```

2. **Configure Storage**:
   - The migration automatically creates a `blog-images` storage bucket
   - Ensure your Supabase project has storage enabled

## Environment Variables

Make sure your `.env` file includes:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features Included

### Public Blog Features
- **Blog Roll** (`/blog`): Displays all published blog posts with pagination
- **Individual Posts** (`/blog/[slug]`): SEO-optimized individual post pages
- **Categories**: Filter posts by category
- **Search**: Search through blog posts
- **Related Posts**: Shows related content

### Admin Features
- **Admin Panel** (`/blog/admin`): Secure admin interface (requires authentication)
- **Rich Text Editor**: User-friendly editor with preview
- **Image Processing**: Automatic image optimization and upload
- **SEO Management**: Meta tags, Open Graph, structured data
- **Draft/Publish**: Save drafts and publish when ready

### Automatic Image Handling
When you paste an image URL in the editor:
1. Image is automatically downloaded
2. Optimized (resized and compressed)
3. Uploaded to Supabase storage
4. URL is replaced with the optimized version

## Usage

### Creating Blog Posts
1. Navigate to `/blog/admin` (must be logged in)
2. Click "New Post"
3. Fill in the post details:
   - Title (slug auto-generated)
   - Category
   - Content (supports markdown-like formatting)
   - Featured image URL
   - SEO metadata
4. Save as draft or publish immediately

### Image Handling
- Paste any image URL in the content editor
- The system will automatically process and optimize it
- Images are stored in the `blog-images` Supabase bucket

### SEO Features
- Automatic meta tag generation
- Open Graph tags for social sharing
- Structured data (JSON-LD) for search engines
- Canonical URLs
- Dynamic page titles

## Database Schema

The blog system uses three main tables:

- `blog_categories`: Post categories
- `blog_posts`: Main blog posts with full content and metadata
- `blog_images`: Tracks uploaded and processed images

## File Structure

```
src/
├── pages/
│   ├── Blog.jsx           # Main blog roll page
│   ├── Blog.css           # Blog styling
│   ├── BlogPost.jsx       # Individual post page
│   ├── BlogPost.css       # Post page styling
│   ├── BlogAdmin.jsx      # Admin panel
│   └── BlogAdmin.css      # Admin styling
├── utils/
│   ├── blogApi.js         # Blog API functions
│   ├── imageProcessor.js  # Image handling
│   ├── seoUtils.js        # SEO utilities
│   └── supabase.js        # Supabase client
supabase/
└── migrations/
    └── 20250115000000_create_blog_system.sql
```

## Security

- Row Level Security (RLS) enabled on all tables
- Public read access for published posts
- Authenticated write access for creating/editing posts
- Image upload validation (file type and size)

## Performance

- Automatic image optimization (WebP format, compression)
- Pagination for large post lists
- Efficient database queries with proper indexing
- SEO-friendly URLs and metadata

## Customization

You can customize:
- Blog post categories in the database
- Image processing settings in `imageProcessor.js`
- SEO templates in `seoUtils.js`
- Styling in the CSS files
- Editor functionality in `BlogAdmin.jsx`

## Troubleshooting

1. **Images not uploading**: Check Supabase storage permissions and bucket configuration
2. **Posts not saving**: Verify RLS policies and user authentication
3. **SEO not working**: Ensure `preact-helmet` is properly configured
4. **Admin access denied**: Make sure user is authenticated before accessing `/blog/admin`

The blog feature is now ready for production use!