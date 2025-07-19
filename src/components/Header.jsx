import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Link, route } from 'preact-router';
import { useAuth } from '../context/Auth';
import ThemeToggle from './ThemeToggle';
import { getProxiedImageUrl } from '../config';
import defaultAvatar from '../assets/default-avatar.png';
import './Header.css';

const Header = () => {
    const [query, setQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { user, profile, signOut } = useAuth();
    const menuRef = useRef(null);
    const hamburgerRef = useRef(null);
    const searchRef = useRef(null);

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
        await signOut();
        route('/');
        setIsMenuOpen(false);
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
        document.body.classList.remove('menu-open');
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
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                if (isMenuOpen) {
                    closeMenu();
                } else if (isSearchOpen) {
                    setIsSearchOpen(false);
                    document.body.classList.remove('menu-open');
                }
            }
        };

        const handleResize = () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        };

        if (isMenuOpen || isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
            window.addEventListener('resize', handleResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
            window.removeEventListener('resize', handleResize);
        };
    }, [isMenuOpen, isSearchOpen]);

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
        <header class={isMenuOpen ? 'scrolled' : ''}>
            <div class="container">
                <div class="header-left">
                    <Link href="/" class="logo" onClick={closeMenu}>Fylm</Link>
                    <nav ref={menuRef} class={isMenuOpen ? 'active' : ''} aria-hidden={!isMenuOpen}>
                        <ul>
                            <li><Link activeClassName="active" href="/movies" onClick={closeMenu}>Movies</Link></li>
                            <li><Link activeClassName="active" href="/tv" onClick={closeMenu}>TV</Link></li>
                            <li><Link activeClassName="active" href="/anime" onClick={closeMenu}>Anime</Link></li>
                            {user ? (
                                <>
                                    <li><Link activeClassName="active" href="/favorites" onClick={closeMenu}>Favorites</Link></li>
                                    <li><Link activeClassName="active" href="/history" onClick={closeMenu}>History</Link></li>
                                    
                                </>
                            ) : (
                                <>
                                    <li><a href="/login" style={{ color: '#999', fontSize: '0.9em' }} onClick={closeMenu}>Favorites (Login Required)</a></li>
                                    <li><a href="/login" style={{ color: '#999', fontSize: '0.9em' }} onClick={closeMenu}>History (Login Required)</a></li>
                                </>
                            )}
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
                    <div class="mobile-menu-backdrop" onClick={closeMenu}></div>
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
                    
                    <ThemeToggle />
                    <div class="auth-links">
                        {user ? (
                            <>
                                <Link href="/profile" class="profile-link" onClick={closeMenu}>
                                    <img
                                        src={profile?.avatar_url ? getProxiedImageUrl(profile.avatar_url) : (user.user_metadata?.avatar_url ? getProxiedImageUrl(user.user_metadata.avatar_url) : defaultAvatar)}
                                        alt="Profile"
                                        class="profile-avatar"
                                    />
                                </Link>
                                <button onClick={handleLogout} class="auth-button">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" class="auth-link" onClick={closeMenu}>Login</Link>
                                <Link href="/signup" class="auth-link" onClick={closeMenu}>Sign Up</Link>
                            </>
                        )}
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
        </header>
    );
};

export default Header;