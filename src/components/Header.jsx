import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Link, route } from 'preact-router';
import './Header.css';

const Header = () => {
    const [query, setQuery] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            route(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    };

    return (
        <header>
            <div class="container">
                <Link href="/" class="logo">MyStream</Link>
                <nav>
                    <Link activeClassName="active" href="/?type=movie">Movies</Link>
                    <Link activeClassName="active" href="/?type=tv">TV Shows</Link>
                    <Link activeClassName="active" href="/favorites">Favorites</Link>
                    <Link activeClassName="active" href="/history">History</Link>
                </nav>
                <form class="search-container" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={query}
                        onInput={(e) => setQuery(e.target.value)}
                    />
                </form>
            </div>
        </header>
    );
};

export default Header; 