import { h } from 'preact';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';

import Header from './components/Header';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import History from './pages/History';
import Watch from './pages/Watch';
import SearchPage from './pages/Search'; // Assuming we move search.jsx to pages/Search.jsx

const App = () => (
    <div class="app">
        <Header />
        <main>
            <Router history={createHashHistory()}>
                <Home path="/" />
                <Favorites path="/favorites" />
                <History path="/history" />
                <Watch path="/watch" />
                <SearchPage path="/search" />
            </Router>
        </main>
        <footer>
            <p>&copy; 2024 MyStream. All Rights Reserved.</p>
        </footer>
    </div>
);

export default App; 