import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { getCurrentTheme, toggleTheme, THEMES } from '../utils/themeUtils';
import './ThemeToggle.css';

const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Get current theme from centralized utility
        const currentTheme = getCurrentTheme();
        setIsDark(currentTheme === THEMES.DARK);

        // Listen for theme changes from other components
        const handleThemeChange = (event) => {
            setIsDark(event.detail.theme === THEMES.DARK);
        };

        window.addEventListener('themeChanged', handleThemeChange);
        return () => {
            window.removeEventListener('themeChanged', handleThemeChange);
        };
    }, []);

    const handleToggleTheme = () => {
        const newTheme = toggleTheme();
        setIsDark(newTheme === THEMES.DARK);
    };

    return (
        <button 
            class={`theme-toggle ${isDark ? 'dark' : 'light'}`}
            onClick={handleToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            <div class="toggle-track">
                <div class="toggle-thumb">
                    <div class="icon">
                        {isDark ? (
                            // Moon icon
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                            </svg>
                        ) : (
                            // Sun icon
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5"/>
                                <line x1="12" y1="1" x2="12" y2="3"/>
                                <line x1="12" y1="21" x2="12" y2="23"/>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                <line x1="1" y1="12" x2="3" y2="12"/>
                                <line x1="21" y1="12" x2="23" y2="12"/>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
};

export default ThemeToggle; 