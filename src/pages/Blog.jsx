import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Link } from 'preact-router/match';
import { route } from 'preact-router';
import { BlogAPI } from '../utils/blogApi';
import { updatePageTitle, updateMetaDescription, updateOpenGraphTags } from '../utils/seoUtils';
import { useAuth } from '../context/Auth';
import Header from '../components/Header';
import './Blog.css';

const Blog = () => {
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();

    const postsPerPage = 12;

    useEffect(() => {
        // Update SEO
        updatePageTitle('Blog - Latest Articles & Insights');
        updateMetaDescription('Discover the latest articles, insights, and updates from our blog. Stay informed with our expert content.');
        updateOpenGraphTags({
            title: 'Blog - Latest Articles & Insights',
            description: 'Discover the latest articles, insights, and updates from our blog.',
            image: '/android-chrome-512x512.png',
            url: window.location.href
        });

        loadInitialData();
    }, []);

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

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [postsData, categoriesData] = await Promise.all([
                BlogAPI.getPublishedPosts({ limit: postsPerPage, offset: 0 }),
                BlogAPI.getCategories()
            ]);
            
            setPosts(postsData.posts);
            setTotalPages(Math.ceil(postsData.total / postsPerPage));
            setCategories(categoriesData);
        } catch (err) {
            setError('Failed to load blog content');
            console.error('Error loading blog data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = async (page) => {
        try {
            setLoading(true);
            const offset = (page - 1) * postsPerPage;
            const postsData = await BlogAPI.getPublishedPosts({ 
                limit: postsPerPage, 
                offset: offset, 
                categorySlug: selectedCategory 
            });
            setPosts(postsData.posts);
            setCurrentPage(page);
            setTotalPages(Math.ceil(postsData.total / postsPerPage));
        } catch (err) {
            setError('Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryFilter = async (categorySlug) => {
        try {
            setLoading(true);
            setSelectedCategory(categorySlug);
            setCurrentPage(1);
            const postsData = await BlogAPI.getPublishedPosts({ 
                limit: postsPerPage, 
                offset: 0, 
                categorySlug: categorySlug 
            });
            setPosts(postsData.posts);
            setTotalPages(Math.ceil(postsData.total / postsPerPage));
        } catch (err) {
            setError('Failed to filter posts');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            setIsSearching(true);
            const postsData = await BlogAPI.getPublishedPosts({ 
                limit: 50, 
                offset: 0, 
                searchTerm: searchQuery 
            });
            setSearchResults(postsData.posts);
        } catch (err) {
            setError('Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
                    disabled={loading}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="pagination">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="pagination-btn"
                >
                    Previous
                </button>
                {pages}
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        );
    };

    const displayPosts = searchResults.length > 0 ? searchResults : posts;

    if (loading && posts.length === 0) {
        return (
            <div className="app">
                <Header />
                <main className="main-content">
                    <div className="container">
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading blog posts...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <Header />
                <main className="main-content">
                    <div className="container">
                        <div className="error-container">
                            <h2>Oops! Something went wrong</h2>
                            <p>{error}</p>
                            <button onClick={loadInitialData} className="btn btn-primary">
                                Try Again
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <Header />
            <main className="main-content">
                <div className="container">
                    {/* Hero Section */}
                    <div className="page-header">
                        <h1>Blog</h1>
                        <p>Discover insights, updates, and stories from our team</p>
                    </div>

                    {/* Search and Filters */}
                    <div className="blog-controls">
                        <form onSubmit={handleSearch} className="search-form">
                            <div className="search-input-group">
                                <input
                                    type="text"
                                    placeholder="Search articles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                <button type="submit" disabled={isSearching} className="btn btn-primary">
                                    {isSearching ? 'Searching...' : 'Search'}
                                </button>
                                {searchResults.length > 0 && (
                                    <button type="button" onClick={clearSearch} className="btn btn-secondary">
                                        Clear
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="category-filters">
                            <button
                                onClick={() => handleCategoryFilter('')}
                                className={`filter-btn ${selectedCategory === '' ? 'active' : ''}`}
                            >
                                All
                            </button>
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryFilter(category.slug)}
                                    className={`filter-btn ${selectedCategory === category.slug ? 'active' : ''}`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Posts Grid */}
                    <div className="blog-content">
                        {displayPosts.length === 0 ? (
                            <div className="empty-state">
                                <h3>No posts found</h3>
                                <p>{searchResults.length === 0 && searchQuery ? 'Try a different search term.' : 'Check back later for new content.'}</p>
                            </div>
                        ) : (
                            <div className="posts-grid">
                                {displayPosts.map(post => (
                                    <article key={post.id} className="post-card">
                                        {post.featured_image && (
                                            <div className="post-image">
                                                <img src={post.featured_image} alt={post.title} loading="lazy" />
                                            </div>
                                        )}
                                        <div className="post-content">
                                            <div className="post-meta">
                                                <span className="post-category">{post.category_name}</span>
                                                <span className="post-date">{formatDate(post.created_at)}</span>
                                            </div>
                                            <h2 className="post-title">
                                                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                                            </h2>
                                            <p className="post-excerpt">{post.excerpt}</p>
                                            {post.tags && post.tags.length > 0 && (
                                                <div className="post-tags">
                                                    {post.tags.map(tag => (
                                                        <span key={tag} className="tag">{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="post-actions">
                                <Link href={`/blog/${post.slug}`} className="read-more">
                                    Read More →
                                </Link>
                                {isAdmin && (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => route(`/blog/admin?edit=${post.id}`)}
                                        title="Edit this post"
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {searchResults.length === 0 && renderPagination()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Blog;