import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';
import { AuthProvider, useAuth } from './context/Auth';
import { Toaster } from './components/Toast';
import { initializeTheme } from './utils/themeUtils';
import { useStore } from './store';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import History from './pages/History';
import Watch from './pages/Watch';
import SearchPage from './pages/Search'; // Assuming we move search.jsx to pages/Search.jsx
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import ScrollToTop from './components/ScrollToTop';


const MainApp = () => {
    const { user } = useAuth();
    const fetchFavorites = useStore((state) => state.fetchFavorites);
    const favoritesFetched = useStore((state) => state.favoritesFetched);
    const fetchContinueWatching = useStore((state) => state.fetchContinueWatching);
    const continueWatchingFetched = useStore((state) => state.continueWatchingFetched);

    useEffect(() => {
        if (user) {
            if (!favoritesFetched) {
                fetchFavorites();
            }
            if (!continueWatchingFetched) {
                fetchContinueWatching();
            }
        }
    }, [user, favoritesFetched, fetchFavorites, continueWatchingFetched, fetchContinueWatching]);

    return (
        <div class="app">
            <Toaster position="top-center" />
            <Header />
            <main>
                <Router history={createHashHistory()}>
                    <Home path="/" />
                    <Home path="/movies" />
                    <Home path="/tv" />
                    {user ? <Favorites path="/favorites" /> : <Login path="/favorites" />}
                    {user ? <History path="/history" /> : <Login path="/history" />}
                    <Watch path="/watch/:type/:id" />
                    <Watch path="/watch/:type/:id/season/:season/episode/:episode" />
                    <SearchPage path="/search" />
                    <Login path="/login" />
                    <SignUp path="/signup" />
                    <ForgotPassword path="/forgot-password" />
                    <UpdatePassword path="/update-password" />
                </Router>
            </main>
            <Footer />
            <ScrollToTop />
        </div>
    );
};

const App = () => {
    useEffect(() => {
        initializeTheme();
    }, []);

    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
};

export default App; 