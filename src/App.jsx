import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';
import { AuthProvider } from './context/Auth';
import { Toaster } from './components/Toast';
import { initializeTheme } from './utils/themeUtils';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import History from './pages/History';
import Watch from './pages/Watch';
import SearchPage from './pages/Search'; // Assuming we move search.jsx to pages/Search.jsx
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import PrivateRoute from './components/PrivateRoute';
import ScrollToTop from './components/ScrollToTop';

const App = () => {
    // Initialize theme system on app startup
    useEffect(() => {
        initializeTheme();
    }, []);

    return (
        <AuthProvider>
            <div class="app">
                <Toaster position="top-center" />
                <Header />
                <main>
                    <Router history={createHashHistory()}>
                        <Home path="/" />
                        <Home path="/movies" />
                        <Home path="/tv" />
                        <PrivateRoute component={Favorites} path="/favorites" />
                        <PrivateRoute component={History} path="/history" />
                        <Watch path="/watch/:type/:id" />
                        <Watch path="/watch/:type/:id/season/:season/episode/:episode" />
                        <SearchPage path="/search" />
                        <Login path="/login" />
                        <SignUp path="/signup" />
                    </Router>
                </main>
                <Footer />
                <ScrollToTop />
            </div>
        </AuthProvider>
    );
};

export default App; 