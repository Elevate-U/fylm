import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';
import { AuthProvider, useAuth } from './context/Auth';
import { Toaster } from './components/Toast';
import { initializeTheme } from './utils/themeUtils';
import { useStore } from './store';
import { setupErrorHandler } from './utils/errorHandler';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import asyncComponent from './components/asyncComponent';
import LoadingSpinner from './components/LoadingSpinner';

const AsyncHome = asyncComponent(() => import('./pages/Home'));
const AsyncFavorites = asyncComponent(() => import('./pages/Favorites'));
const AsyncHistory = asyncComponent(() => import('./pages/History'));
const AsyncWatch = asyncComponent(() => import('./pages/Watch'));
const AsyncSearchPage = asyncComponent(() => import('./pages/Search'));
const AsyncLogin = asyncComponent(() => import('./pages/Login'));
const AsyncSignUp = asyncComponent(() => import('./pages/SignUp'));
const AsyncForgotPassword = asyncComponent(() => import('./pages/ForgotPassword'));
const AsyncUpdatePassword = asyncComponent(() => import('./pages/UpdatePassword'));
const AsyncProfile = asyncComponent(() => import('./pages/Profile'));
const AsyncAnime = asyncComponent(() => import('./pages/Anime'));
const AsyncMoviePage = asyncComponent(() => import('./movie.jsx'));
const AsyncTermsOfService = asyncComponent(() => import('./pages/TermsOfService'));
const AsyncPrivacyPolicy = asyncComponent(() => import('./pages/PrivacyPolicy'));
const AsyncBlog = asyncComponent(() => import('./pages/Blog'));
const AsyncBlogPost = asyncComponent(() => import('./pages/BlogPost'));
const AsyncBlogAdmin = asyncComponent(() => import('./pages/BlogAdmin'));
const AsyncAdminSetup = asyncComponent(() => import('./pages/AdminSetup'));


const MainApp = () => {
    const { user, authReady, loading } = useAuth();
    const fetchFavorites = useStore((state) => state.fetchFavorites);
    const favoritesFetched = useStore((state) => state.favoritesFetched);
    const fetchContinueWatching = useStore((state) => state.fetchContinueWatching);
    const continueWatchingFetched = useStore((state) => state.continueWatchingFetched);

    useEffect(() => {
        if (user) {
            const userId = user.id;
            if (!favoritesFetched) {
                fetchFavorites(userId);
            }
            if (!continueWatchingFetched) {
                fetchContinueWatching(userId);
            }
        }
    }, [user, favoritesFetched, fetchFavorites, continueWatchingFetched, fetchContinueWatching]);

    if (loading && !authReady) {
        return <LoadingSpinner />;
    }

    return (
        <div class="app">
            <Toaster position="top-right" />
            <Header />
            <main>
                <Router history={createHashHistory()}>
                    <AsyncHome path="/" />
                    <AsyncHome path="/movies" />
                    <AsyncHome path="/tv" />
                    <AsyncMoviePage path="/movie/:id" type="movie" />
                    <AsyncMoviePage path="/tv/:id" type="tv" />
                    <AsyncAnime path="/anime" />
                    {user ? <AsyncFavorites path="/favorites" /> : <AsyncLogin path="/favorites" />}
                    {user ? <AsyncHistory path="/history" /> : <AsyncLogin path="/history" />}
                    <AsyncWatch path="/watch/:type/:id" />
                    <AsyncWatch path="/watch/:type/:id/season/:season/episode/:episode" />
                    <AsyncSearchPage path="/search" />
                    <AsyncLogin path="/login" />
                    <AsyncSignUp path="/signup" />
                    <AsyncForgotPassword path="/forgot-password" />
                    <AsyncUpdatePassword path="/update-password" />
                    {user ? <AsyncProfile path="/profile" /> : <AsyncLogin path="/profile" />}
                    <AsyncBlog path="/blog" />
                    <AsyncBlogPost path="/blog/:slug" />
                    {user ? <AsyncBlogAdmin path="/blog-admin" /> : <AsyncLogin path="/blog-admin" />}
                    {user ? <AsyncBlogAdmin path="/blog/admin" /> : <AsyncLogin path="/blog/admin" />}
                    {user ? <AsyncAdminSetup path="/admin-setup" /> : <AsyncLogin path="/admin-setup" />}
                    <AsyncTermsOfService path="/terms-of-service" />
                    <AsyncPrivacyPolicy path="/privacy-policy" />
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
        setupErrorHandler();
    }, []);

    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
};

export default App;