import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';
import { AuthProvider, useAuth } from './context/Auth';
import { Toaster } from './components/Toast';
import { initializeTheme } from './utils/themeUtils';
import { useStore } from './store';
import { setupErrorHandler } from './utils/errorHandler';
import { initializeIOSOptimizations, isIOS } from './utils/iosUtils';
import { setupNetworkListeners, shouldShowNetworkWarning, isOnline } from './utils/networkUtils';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AnimatedBackground from './components/AnimatedBackground';
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
const AsyncCookiePolicy = asyncComponent(() => import('./pages/CookiePolicy'));
const AsyncBlog = asyncComponent(() => import('./pages/Blog'));
const AsyncBlogPost = asyncComponent(() => import('./pages/BlogPost'));
const AsyncBlogAdmin = asyncComponent(() => import('./pages/BlogAdmin'));
const AsyncAdminSetup = asyncComponent(() => import('./pages/AdminSetup'));
const AsyncAuthCallback = asyncComponent(() => import('./pages/AuthCallback'));
const AsyncBrowse = asyncComponent(() => import('./pages/Browse'));


const MainApp = () => {
    const { user, authReady, loading, authError } = useAuth();
    const fetchFavorites = useStore((state) => state.fetchFavorites);
    const favoritesFetched = useStore((state) => state.favoritesFetched);
    const fetchContinueWatching = useStore((state) => state.fetchContinueWatching);
    const continueWatchingFetched = useStore((state) => state.continueWatchingFetched);
    const [networkWarning, setNetworkWarning] = useState(null);
    const [isOffline, setIsOffline] = useState(!isOnline());

    // Setup network monitoring
    useEffect(() => {
        // Check network status on mount
        const warning = shouldShowNetworkWarning();
        if (warning.show) {
            setNetworkWarning(warning.message);
        }
        
        // Setup network listeners
        const cleanup = setupNetworkListeners(
            () => {
                setIsOffline(false);
                setNetworkWarning(null);
                console.log('✅ Network connection restored');
            },
            () => {
                setIsOffline(true);
                setNetworkWarning('You are offline. Please check your connection.');
                console.warn('❌ Network connection lost');
            }
        );
        
        return cleanup;
    }, []);

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

    // Show loading spinner with timeout warning
    if (loading && !authReady) {
        return (
            <div>
                <LoadingSpinner showTimeout={true} />
                {/* Show offline warning */}
                {isOffline && (
                    <div style="position: fixed; top: 20%; left: 50%; transform: translate(-50%, 0); text-align: center; width: 90%; max-width: 400px; padding: 1.5rem; background: rgba(255, 165, 0, 0.15); border: 1px solid rgba(255, 165, 0, 0.4); border-radius: 8px; z-index: 1000;">
                        <p style="color: #ffa500; font-weight: bold; margin-bottom: 0.5rem;">📵 Offline</p>
                        <p style="color: #fff; font-size: 0.85rem;">You appear to be offline. Please check your connection.</p>
                    </div>
                )}
                {/* Show network warning for slow connections */}
                {!isOffline && networkWarning && !authError && (
                    <div style="position: fixed; top: 20%; left: 50%; transform: translate(-50%, 0); text-align: center; width: 90%; max-width: 400px; padding: 1.5rem; background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3); border-radius: 8px; z-index: 1000;">
                        <p style="color: #ffa500; font-weight: bold; margin-bottom: 0.5rem;">⚠️ Slow Connection</p>
                        <p style="color: #fff; font-size: 0.85rem;">{networkWarning}</p>
                    </div>
                )}
                {/* Show auth error */}
                {authError && (
                    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 90%; max-width: 400px; padding: 2rem; background: rgba(255, 0, 0, 0.1); border: 1px solid rgba(255, 0, 0, 0.3); border-radius: 8px; z-index: 1001;">
                        <p style="color: #ff6b6b; font-weight: bold; margin-bottom: 0.5rem;">⚠️ Connection Issue</p>
                        <p style="color: #fff; font-size: 0.9rem;">{authError}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;"
                        >
                            Refresh Page
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div class="app">
            <AnimatedBackground />
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
                    <AsyncAuthCallback path="/auth/callback" />
                    {user ? <AsyncProfile path="/profile" /> : <AsyncLogin path="/profile" />}
                    <AsyncBlog path="/blog" />
                    <AsyncBlogPost path="/blog/:slug" />
                    {user ? <AsyncBlogAdmin path="/blog-admin" /> : <AsyncLogin path="/blog-admin" />}
                    {user ? <AsyncBlogAdmin path="/blog/admin" /> : <AsyncLogin path="/blog/admin" />}
                    {user ? <AsyncAdminSetup path="/admin-setup" /> : <AsyncLogin path="/admin-setup" />}
                    <AsyncTermsOfService path="/terms-of-service" />
                    <AsyncPrivacyPolicy path="/privacy-policy" />
                    <AsyncCookiePolicy path="/cookie-policy" />
                    <AsyncBrowse path="/browse/:type/:category" />
                    <AsyncBrowse path="/browse/:type/:category/:filter" />
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
        
        // Initialize iOS-specific optimizations
        if (isIOS()) {
            console.log('🍎 iOS device detected, applying optimizations...');
            initializeIOSOptimizations();
        }
    }, []);

    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
};

export default App;