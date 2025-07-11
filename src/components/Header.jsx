import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Link, route } from 'preact-router';
import { useAuth } from '../context/Auth';
import ThemeToggle from './ThemeToggle';
import './Header.css';

const Header = () => {
    const [query, setQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { user, signOut } = useAuth();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            route(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
            setIsSearchOpen(false); // Close search on mobile after search
        }
    };

    const handleLogout = async () => {
        await signOut();
        route('/');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        setIsSearchOpen(false); // Close search when menu is toggled
    };

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        setIsMenuOpen(false); // Close menu when search is toggled
    };

    return (
        <header>
            <div class="container">
                <div class="header-left">
                    <Link href="/" class="logo">FreeStream</Link>
                    <nav class={isMenuOpen ? 'active' : ''}>
                        <ul onClick={() => setIsMenuOpen(false)}>
                            <li><Link activeClassName="active" href="/movies">Movies</Link></li>
                            <li><Link activeClassName="active" href="/tv">TV</Link></li>
                            {user ? (
                                <>
                                    <li><Link activeClassName="active" href="/favorites">Favorites</Link></li>
                                    <li><Link activeClassName="active" href="/history">History</Link></li>
                                </>
                            ) : (
                                <>
                                    <li><a href="/login" style={{ color: '#999', fontSize: '0.9em' }}>Favorites (Login Required)</a></li>
                                    <li><a href="/login" style={{ color: '#999', fontSize: '0.9em' }}>History (Login Required)</a></li>
                                </>
                            )}
                        </ul>
                    </nav>
                </div>
                
                {/* Mobile Search Overlay */}
                {isSearchOpen && (
                    <div class="mobile-search-overlay">
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
                                <span class="user-email">{user.email}</span>
                                <button onClick={handleLogout} class="auth-button">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" class="auth-link">Login</Link>
                                <Link href="/signup" class="auth-link">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
                <button class="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                </button>
            </div>
        </header>
    );
};

export default Header; 