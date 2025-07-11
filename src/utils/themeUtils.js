/**
 * Theme Management Utilities
 * Modern theme system with light/dark mode support
 */

// Theme constants
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light'
};

/**
 * Get the current theme from localStorage or system preference
 * @returns {string} Current theme ('light' or 'dark')
 */
export const getCurrentTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
    return savedTheme;
  }
  
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
};

/**
 * Apply a theme to the document
 * @param {string} theme - Theme to apply ('light' or 'dark')
 */
export const applyTheme = (theme) => {
  if (!Object.values(THEMES).includes(theme)) {
    console.warn(`Invalid theme: ${theme}. Using default dark theme.`);
    theme = THEMES.DARK;
  }

  if (theme === THEMES.LIGHT) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  localStorage.setItem('theme', theme);
  
  // Dispatch custom event for components that need to react to theme changes
  window.dispatchEvent(new CustomEvent('themeChanged', { 
    detail: { theme } 
  }));
};

/**
 * Toggle between light and dark themes
 * @returns {string} The new active theme
 */
export const toggleTheme = () => {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  applyTheme(newTheme);
  return newTheme;
};

/**
 * Set up theme on app initialization
 * Call this when your app starts to ensure proper theme is applied
 */
export const initializeTheme = () => {
  const theme = getCurrentTheme();
  applyTheme(theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
    }
  });
};

/**
 * Get theme-aware CSS custom property value
 * @param {string} property - CSS custom property name (without --)
 * @returns {string} Computed CSS value
 */
export const getThemeProperty = (property) => {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`).trim();
};

/**
 * Check if current theme is dark
 * @returns {boolean} True if dark theme is active
 */
export const isDarkTheme = () => {
  return getCurrentTheme() === THEMES.DARK;
};

/**
 * Check if current theme is light
 * @returns {boolean} True if light theme is active
 */
export const isLightTheme = () => {
  return getCurrentTheme() === THEMES.LIGHT;
};

// Default export with all utilities
export default {
  THEMES,
  getCurrentTheme,
  applyTheme,
  toggleTheme,
  initializeTheme,
  getThemeProperty,
  isDarkTheme,
  isLightTheme
}; 