import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Link, route } from 'preact-router';
import { BlogAPI } from '../utils/blogApi';
import { updatePageTitle, updateMetaDescription, updateOpenGraphTags, addStructuredData, updateCanonicalUrl } from '../utils/seoUtils';
import { useAuth } from '../context/Auth';
import LoadingSpinner from '../components/LoadingSpinner';
import Header from '../components/Header';
import './BlogPost.css';

const BlogPost = ({ slug }) => {
    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (slug) {
            loadPost();
        }
    }, [slug]);

    // Check admin status when user changes
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user) {
                try {
                    const adminStatus = await BlogAPI.isAdmin();
                    setIsAdmin(adminStatus);
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        };
        
        checkAdminStatus();
    }, [user]);

    const loadPost = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch the blog post
            const postData = await BlogAPI.getPostBySlug(slug);
            
            if (!postData) {
                setError('Blog post not found');
                return;
            }

            setPost(postData);

            // Update SEO
            updateSEO(postData);

            // Fetch related posts
            const related = await BlogAPI.getRelatedPosts(
                postData.id,
                postData.category_id,
                postData.tags,
                3
            );
            setRelatedPosts(related);

        } catch (err) {
            console.error('Error loading blog post:', err);
            setError('Failed to load blog post');
        } finally {
            setLoading(false);
        }
    };

    const updateSEO = (postData) => {
        // Update page title
        const title = postData.meta_title || `${postData.title} | Fylm Blog`;
        updatePageTitle(title);

        // Update meta description
        const description = postData.meta_description || postData.excerpt || 
            `Read ${postData.title} on Fylm Blog. ${postData.category_name} content and more.`;
        updateMetaDescription(description);

        // Update Open Graph tags
        updateOpenGraphTags({
            title: postData.title,
            description: description,
            image: postData.featured_image_url || '/android-chrome-512x512.png',
            type: 'article',
            url: window.location.href
        });

        // Update canonical URL
        updateCanonicalUrl(window.location.href);

        // Add structured data for article
        addStructuredData({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            'headline': postData.title,
            'description': description,
            'image': postData.featured_image_url || '/android-chrome-512x512.png',
            'author': {
                '@type': 'Person',
                'name': 'Fylm Editorial Team'
            },
            'publisher': {
                '@type': 'Organization',
                'name': 'Fylm',
                'logo': {
                    '@type': 'ImageObject',
                    'url': '/android-chrome-512x512.png'
                }
            },
            'datePublished': postData.published_at,
            'dateModified': postData.updated_at || postData.published_at,
            'mainEntityOfPage': {
                '@type': 'WebPage',
                '@id': window.location.href
            },
            'articleSection': postData.category_name,
            'keywords': postData.tags?.join(', ') || '',
            'wordCount': postData.content ? postData.content.replace(/<[^>]*>/g, '').split(' ').length : 0,
            'timeRequired': `PT${postData.read_time || 5}M`
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatContent = (content) => {
        // Basic content formatting and fix hash-based links
        let formattedContent = content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
        
        // Fix hash-based links to be absolute from root
        // Handle links that start with /movie/ or /tv/ and make them hash-based for SPA routing
        formattedContent = formattedContent.replace(
            /href="\/movie\//g, 
            'href="/#/movie/'
        ).replace(
            /href="\/tv\//g,
            'href="/#/tv/'
        ).replace(
            /href="#\//g, 
            'href="/#/'
        ).replace(
            /href="\/#\/#\//g,
            'href="/#/'
        );
        
        return formattedContent;
    };

    if (loading) {
        return (
            <>
                <Header />
                <main class="container blog-post-page">
                    <LoadingSpinner />
                </main>
            </>
        );
    }

    if (error || !post) {
        return (
            <>
                <Header />
                <main class="container blog-post-page">
                    <div class="error-message">
                        <h1>Post Not Found</h1>
                        <p>{error || 'The blog post you are looking for does not exist.'}</p>
                        <Link href="/blog" class="back-to-blog-btn">
                            ← Back to Blog
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            
            {/* Hero Section - Medium Style */}
            <div class="blog-hero">
                <div class="hero-content">
                    {/* Breadcrumb Navigation */}
                    <nav class="breadcrumb">
                        <Link href="/">Home</Link>
                        <span class="separator">›</span>
                        <Link href="/blog">Blog</Link>
                        {post.category_name && (
                            <>
                                <span class="separator">›</span>
                                <Link href={`/blog?category=${post.category_slug}`}>
                                    {post.category_name}
                                </Link>
                            </>
                        )}
                    </nav>

                    {post.category_name && (
                        <div class="post-category" style={`background-color: ${post.category_color}`}>
                            {post.category_name}
                        </div>
                    )}
                    
                    <h1 class="hero-title">{post.title}</h1>
                    
                    {post.excerpt && (
                        <div class="hero-excerpt">
                            {post.excerpt}
                        </div>
                    )}
                    
                    <div class="hero-meta">
                        <div class="meta-left">
                            <time class="post-date" dateTime={post.published_at}>
                                {formatDate(post.published_at)}
                            </time>
                            <span class="separator">•</span>
                            <span class="post-read-time">{post.read_time} min read</span>
                            <span class="separator">•</span>
                            <span class="post-views">{post.view_count} views</span>
                        </div>
                        {isAdmin && (
                            <div class="meta-right">
                                <button 
                                    class="edit-post-btn"
                                    onClick={() => route(`/blog/admin?edit=${post.id}`)}
                                    title="Edit this post"
                                >
                                    ✏️ Edit Post
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main class="blog-post-main">
                <article class="blog-post-article">
                    {/* Featured Image */}
                    {post.featured_image_url && (
                        <div class="post-featured-image">
                            <img 
                                src={post.featured_image_url} 
                                alt={post.title}
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Post Content */}
                    <div class="post-content">
                        <div 
                            class="content-body"
                            dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
                        />
                    </div>

                    {/* Post Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div class="post-tags">
                            <div class="tags-list">
                                {post.tags.map(tag => (
                                    <span key={tag} class="tag">
                                        #{tag.replace(' ', '')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Social Sharing */}
                    <div class="post-sharing">
                        <div class="sharing-buttons">
                            <a 
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="share-btn twitter"
                            >
                                Share on Twitter
                            </a>
                            <a 
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="share-btn facebook"
                            >
                                Share on Facebook
                            </a>
                            <button 
                                class="share-btn copy-link"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    // You could add a toast notification here
                                }}
                            >
                                Copy Link
                            </button>
                        </div>
                    </div>
                </article>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <section class="related-posts">
                    <h2>Related Posts</h2>
                    <div class="related-posts-grid">
                        {relatedPosts.map(relatedPost => (
                            <article key={relatedPost.id} class="related-post-card">
                                {relatedPost.featured_image_url && (
                                    <div class="related-post-image">
                                        <img 
                                            src={relatedPost.featured_image_url} 
                                            alt={relatedPost.title}
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                                <div class="related-post-content">
                                    {relatedPost.blog_categories && (
                                        <div 
                                            class="related-post-category"
                                            style={`background-color: ${relatedPost.blog_categories.color}`}
                                        >
                                            {relatedPost.blog_categories.name}
                                        </div>
                                    )}
                                    <h3 class="related-post-title">
                                        <Link href={`/blog/${relatedPost.slug}`}>
                                            {relatedPost.title}
                                        </Link>
                                    </h3>
                                    {relatedPost.excerpt && (
                                        <p class="related-post-excerpt">
                                            {relatedPost.excerpt}
                                        </p>
                                    )}
                                    <div class="related-post-meta">
                                        <time dateTime={relatedPost.published_at}>
                                            {formatDate(relatedPost.published_at)}
                                        </time>
                                        <span>{relatedPost.read_time} min read</span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

                {/* Navigation */}
                <div class="post-navigation">
                    <Link href="/blog" class="back-to-blog-btn">
                        ← Back to Blog
                    </Link>
                </div>
            </main>
        </>
    );
};

export default BlogPost;