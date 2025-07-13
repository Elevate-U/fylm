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
import ScrollToTop from './components/ScrollToTop';
import asyncComponent from './components/asyncComponent';

const AsyncHome = asyncComponent(() => import('./pages/Home'));
const AsyncFavorites = asyncComponent(() => import('./pages/Favorites'));
const AsyncHistory = asyncComponent(() => import('./pages/History'));
const AsyncWatch = asyncComponent(() => import('./pages/Watch'));
const AsyncSearchPage = asyncComponent(() => import('./pages/Search'));
const AsyncLogin = asyncComponent(() => import('./pages/Login'));
const AsyncSignUp = asyncComponent(() => import('./pages/SignUp'));
const AsyncForgotPassword = asyncComponent(() => import('./pages/ForgotPassword'));
const AsyncUpdatePassword = asyncComponent(() => import('./pages/UpdatePassword'));


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
                    <AsyncHome path="/" />
                    <AsyncHome path="/movies" />
                    <AsyncHome path="/tv" />
                    {user ? <AsyncFavorites path="/favorites" /> : <AsyncLogin path="/favorites" />}
                    {user ? <AsyncHistory path="/history" /> : <AsyncLogin path="/history" />}
                    <AsyncWatch path="/watch/:type/:id" />
                    <AsyncWatch path="/watch/:type/:id/season/:season/episode/:episode" />
                    <AsyncSearchPage path="/search" />
                    <AsyncLogin path="/login" />
                    <AsyncSignUp path="/signup" />
                    <AsyncForgotPassword path="/forgot-password" />
                    <AsyncUpdatePassword path="/update-password" />
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