// Global error handler to prevent debugger from opening
export const setupErrorHandler = () => {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        console.log('Caught error:', event.error?.message || event.message);
        event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.log('Caught unhandled rejection:', event.reason);
        event.preventDefault();
    });

    // Override console.error to prevent debugger in production
    if (process.env.NODE_ENV === 'production') {
        const originalError = console.error;
        console.error = (...args) => {
            // Log errors without triggering debugger
            originalError.apply(console, ['[Error]', ...args]);
        };
    }
};