import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Link, route } from 'preact-router';
import { useAuth } from '../context/Auth';
import { BlogAPI } from '../utils/blogApi';
import ThemeToggle from './ThemeToggle';
import { getProxiedImageUrl } from '../config';
import defaultAvatar from '../assets/default-avatar.png';
import './Header.css';

const Header = () => {
    const [query, setQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user, profile, signOut, authReady } = useAuth();
    const menuRef = useRef(null);
    const hamburgerRef = useRef(null);
    const searchRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const profileButtonRef = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            route(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
            setIsSearchOpen(false);
            setIsMenuOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            console.log('Logout button clicked - starting logout process');
            setIsMenuOpen(false); // Close menu immediately
            
            // Clear local state immediately for instant UI feedback
            setIsAdmin(false);
            
            await signOut();
            console.log('SignOut completed successfully');
            
            // Simple redirect to home page
            route('/', true);
        } catch (error) {
            console.error('Error during logout:', error);
            // Clear local state even on error
            setIsAdmin(false);
            // Still redirect on error
            route('/', true);
        }
    };

    const toggleSearch = () => {
        const newSearchState = !isSearchOpen;
        setIsSearchOpen(newSearchState);
        setIsMenuOpen(false);
        
        if (newSearchState) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
    };

    const toggleMenu = () => {
        const newMenuState = !isMenuOpen;
        setIsMenuOpen(newMenuState);
        setIsSearchOpen(false);
        
        if (newMenuState) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
        setIsProfileDropdownOpen(false);
        document.body.classList.remove('menu-open');
    };

    const toggleProfileDropdown = () => {
        setIsProfileDropdownOpen(!isProfileDropdownOpen);
        setIsMenuOpen(false);
        setIsSearchOpen(false);
    };

    // Close menu on route change
    useEffect(() => {
        const originalRoute = route;
        
        // Override route function to close menu before navigation
        const newRoute = (...args) => {
            closeMenu();
            return originalRoute(...args);
        };
        
        // Copy properties from original route
        Object.keys(originalRoute).forEach(key => {
            newRoute[key] = originalRoute[key];
        });
        
        // Replace global route
        window.route = newRoute;
        
        return () => {
            window.route = originalRoute;
        };
    }, []);

    // Handle click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMenuOpen && 
                menuRef.current && 
                !menuRef.current.contains(event.target) && 
                !hamburgerRef.current.contains(event.target)) {
                closeMenu();
            }
            
            if (isSearchOpen && 
                searchRef.current && 
                !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
                document.body.classList.remove('menu-open');
            }

            if (isProfileDropdownOpen && 
                profileDropdownRef.current && 
                !profileDropdownRef.current.contains(event.target) &&
                profileButtonRef.current &&
                !profileButtonRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                if (isMenuOpen) {
                    closeMenu();
                } else if (isSearchOpen) {
                    setIsSearchOpen(false);
                    document.body.classList.remove('menu-open');
                } else if (isProfileDropdownOpen) {
                    setIsProfileDropdownOpen(false);
                }
            }
        };

        const handleResize = () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        };

        if (isMenuOpen || isSearchOpen || isProfileDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
            window.addEventListener('resize', handleResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
            window.removeEventListener('resize', handleResize);
        };
    }, [isMenuOpen, isSearchOpen, isProfileDropdownOpen]);

    // Check admin status when user changes
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user && authReady) {
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
    }, [user, authReady]);

    // Reset states when user changes (especially on logout)
    useEffect(() => {
        if (!user) {
            setIsAdmin(false);
            setIsMenuOpen(false);
            setIsSearchOpen(false);
            setIsProfileDropdownOpen(false);
            document.body.classList.remove('menu-open');
        }
    }, [user]);

    // Focus management for accessibility
    useEffect(() => {
        if (isMenuOpen) {
            const firstFocusable = menuRef.current?.querySelector('a, button');
            firstFocusable?.focus();
        }
    }, [isMenuOpen]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        const originalStyle = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            width: document.body.style.width,
            height: document.body.style.height,
        };

        if (isMenuOpen || isSearchOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        } else {
            document.body.style.overflow = originalStyle.overflow;
            document.body.style.position = originalStyle.position;
            document.body.style.width = originalStyle.width;
            document.body.style.height = originalStyle.height;
        }

        return () => {
            document.body.style.overflow = originalStyle.overflow;
            document.body.style.position = originalStyle.position;
            document.body.style.width = originalStyle.width;
            document.body.style.height = originalStyle.height;
        };
    }, [isMenuOpen, isSearchOpen]);

    return (
        <header key={user?.id || 'no-user'} class={isMenuOpen ? 'scrolled' : ''}>
            <div class="container">
                <div class="header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Link href="/" class="logo" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', fontSize: '2em', lineHeight: 'normal' }}>
                            <img src="/favicon.jpg" alt="Fylm logo" style={{ height: '1em', borderRadius: '0.25em', marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                            Fylm
                        </Link>
                    </div>
                    
                    {/* Desktop Navigation */}
                    <nav class="desktop-nav">
                        <ul>
                            <li><Link activeClassName="active" href="/movies" onClick={closeMenu}>Movies</Link></li>
                            <li><Link activeClassName="active" href="/tv" onClick={closeMenu}>TV</Link></li>
                            <li><Link activeClassName="active" href="/anime" onClick={closeMenu}>Anime</Link></li>
                            {user && isAdmin && (
                                <li><Link activeClassName="active" href="/blog/admin" onClick={closeMenu}>Editor</Link></li>
                            )}
                        </ul>
                    </nav>
                    
                    {/* Mobile Navigation */}
                    <nav ref={menuRef} class={`mobile-nav ${isMenuOpen ? 'active' : ''}`} aria-hidden={!isMenuOpen}>
                        {/* Mobile Menu Close Button */}
                        <button class="mobile-menu-close" onClick={closeMenu} aria-label="Close menu">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        
                        <ul>
                            <li><Link activeClassName="active" href="/movies" onClick={closeMenu}>Movies</Link></li>
                            <li><Link activeClassName="active" href="/tv" onClick={closeMenu}>TV</Link></li>
                            <li><Link activeClassName="active" href="/anime" onClick={closeMenu}>Anime</Link></li>
                            {user && isAdmin && (
                                <li><Link activeClassName="active" href="/blog/admin" onClick={closeMenu}>Editor</Link></li>
                            )}
                            
                            {/* Mobile Auth Links - Only for non-authenticated users */}
                            {!user && (
                                <div class="mobile-auth-section mobile-only">
                                    <li><Link activeClassName="active" href="/login" onClick={closeMenu}>Login</Link></li>
                                    <li><Link activeClassName="active" href="/signup" onClick={closeMenu}>Sign Up</Link></li>
                                </div>
                            )}
                            
                            <li class="theme-toggle-menu-item">
                                <ThemeToggle />
                            </li>
                        </ul>
                    </nav>
                </div>
                
                {/* Mobile Search Overlay */}
                {isSearchOpen && (
                    <div ref={searchRef} class="mobile-search-overlay">
                        <form class="mobile-search-form" onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search movies & TV shows..."
                                value={query}
                                onInput={(e) => setQuery(e.target.value)}
                                class="mobile-search-input"
                                autoFocus
                            />
                            <button type="submit" class="mobile-search-submit">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </button>
                        </form>
                    </div>
                )}
                
                {/* Backdrop for mobile menu */}
                {isMenuOpen && (
                    <div class={`mobile-menu-backdrop ${isMenuOpen ? 'active' : ''}`} onClick={closeMenu}></div>
                )}
                
                <div class="header-right">
                    {/* Desktop Search */}
                    <form class="search-container desktop-only" onSubmit={handleSearch}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={query}
                            onInput={(e) => setQuery(e.target.value)}
                            class="glass-light"
                        />
                    </form>
                    
                    {/* Mobile Search Toggle */}
                    <button class="search-toggle mobile-only" onClick={toggleSearch} aria-label="Toggle search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                    
                    <div class="header-actions">
                        {/* Profile button - always visible */}
                        {user && (
                            <button 
                                ref={profileButtonRef}
                                onClick={toggleProfileDropdown}
                                class="profile-button"
                                aria-label="Profile menu"
                                aria-expanded={isProfileDropdownOpen}
                            >
                                <img
                                    src={profile?.avatar_url ? getProxiedImageUrl(profile.avatar_url) : (user.user_metadata?.avatar_url ? getProxiedImageUrl(user.user_metadata.avatar_url) : defaultAvatar)}
                                    alt="Profile"
                                    class="profile-avatar"
                                    />
                                </button>
                            )}
                        
                        {/* Auth links - hidden at 768px */}
                        <div class="auth-links">
                            {!user && (
                                <>
                                    <Link href="/login" class="auth-link primary-auth" onClick={closeMenu}>Login</Link>
                                    <Link href="/signup" class="auth-link primary-auth" onClick={closeMenu}>Sign Up</Link>
                                </>
                            )}
                        </div>
                        <div class="desktop-only">
                            <ThemeToggle />
                        </div>
                    </div>
                    <button 
                        ref={hamburgerRef}
                        class={`hamburger ${isMenuOpen ? 'active' : ''}`} 
                        onClick={toggleMenu} 
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-menu"
                    >
                        <span class="bar"></span>
                        <span class="bar"></span>
                        <span class="bar"></span>
                    </button>
                </div>
            </div>
            
            {/* Profile Dropdown - Rendered outside header */}
            {isProfileDropdownOpen && user && (
                <div 
                    ref={profileDropdownRef}
                    class="profile-dropdown"
                    style={{
                        position: 'fixed',
                        top: '60px',
                        right: '20px',
                        zIndex: 9999
                    }}
                >
                    <ul class="dropdown-menu">
                        <li>
                            <Link href="/profile" onClick={closeMenu} class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Profile
                            </Link>
                        </li>
                        <li>
                            <Link href="/favorites" onClick={closeMenu} class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                Favorites
                            </Link>
                        </li>
                        <li>
                            <Link href="/history" onClick={closeMenu} class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12,6 12,12 16,14"></polyline>
                                </svg>
                                History
                            </Link>
                        </li>
                        {isAdmin && (
                            <li>
                                <Link href="/blog/admin" onClick={closeMenu} class="dropdown-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Editor
                                </Link>
                            </li>
                        )}
                        <li class="dropdown-divider"></li>
                        <li>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleLogout();
                                }} 
                                class="dropdown-item logout-item"
                                type="button"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16,17 21,12 16,7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </header>
    );
};

export default Header;