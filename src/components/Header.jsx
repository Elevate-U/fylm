import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Link, route } from 'preact-router';
import { useAuth } from '../context/Auth';
import './Header.css';

const Header = () => {
    const [query, setQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, signOut } = useAuth();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            route(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    };

    const handleLogout = async () => {
        await signOut();
        route('/');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header>
            <div class="container">
                <div class="header-left">
                    <Link href="/" class="logo">FreeStream</Link>
                    <nav class={isMenuOpen ? 'active' : ''}>
                        <ul onClick={() => setIsMenuOpen(false)}>
                            <li><Link activeClassName="active" href="/?type=movie">Movies</Link></li>
                            <li><Link activeClassName="active" href="/?type=tv">TV Shows</Link></li>
                            <li><Link activeClassName="active" href="/favorites">Favorites</Link></li>
                            <li><Link activeClassName="active" href="/history">History</Link></li>
                        </ul>
                    </nav>
                </div>
                <div class="header-right">
                    <form class="search-container" onSubmit={handleSearch}>
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={query}
                            onInput={(e) => setQuery(e.target.value)}
                        />
                    </form>
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