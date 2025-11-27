/**
 * Network Utility Functions for Mobile Connectivity
 * Helps detect and handle poor network conditions on mobile devices
 */

/**
 * Helper to get the connection object across different browsers
 */
const getConnection = () => {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

/**
 * Check if the browser is online
 */
export const isOnline = () => {
    return navigator.onLine;
};

/**
 * Detect if user is on a slow connection (2G, slow-2g)
 */
export const isSlowConnection = () => {
    const connection = getConnection();
    if (!connection) return false;
    
    const slowTypes = ['slow-2g', '2g'];
    return slowTypes.includes(connection.effectiveType);
};

/**
 * Get connection information
 */
export const getConnectionInfo = () => {
    const connection = getConnection();
    if (!connection) {
        return {
            type: 'unknown',
            effectiveType: 'unknown',
            downlink: 'unknown',
            rtt: 'unknown'
        };
    }
    
    return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 'unknown',
        rtt: connection.rtt || 'unknown',
        saveData: connection.saveData || false
    };
};

/**
 * Test network connectivity by pinging a reliable endpoint
 * @param {number} timeout - Timeout in milliseconds (default 5000ms)
 * @returns {Promise<boolean>}
 */
export const testNetworkConnectivity = async (timeout = 5000) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        // Use a lightweight endpoint (1x1 pixel or favicon)
        const response = await fetch('/favicon.ico', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.warn('Network connectivity test failed:', error.message);
        return false;
    }
};

/**
 * Wait for network to be online
 * @param {number} maxWait - Maximum wait time in milliseconds
 * @returns {Promise<boolean>}
 */
export const waitForOnline = (maxWait = 10000) => {
    return new Promise((resolve) => {
        if (navigator.onLine) {
            resolve(true);
            return;
        }
        
        const timeout = setTimeout(() => {
            window.removeEventListener('online', onlineHandler);
            resolve(false);
        }, maxWait);
        
        const onlineHandler = () => {
            clearTimeout(timeout);
            window.removeEventListener('online', onlineHandler);
            resolve(true);
        };
        
        window.addEventListener('online', onlineHandler);
    });
};

/**
 * Setup network change listeners
 * @param {Function} onOnline - Callback when network comes online
 * @param {Function} onOffline - Callback when network goes offline
 * @returns {Function} cleanup function
 */
export const setupNetworkListeners = (onOnline, onOffline) => {
    const handleOnline = () => {
        console.log('📶 Network: Online');
        if (onOnline) onOnline();
    };
    
    const handleOffline = () => {
        console.log('📵 Network: Offline');
        if (onOffline) onOffline();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Setup connection change listener if available
    let connectionChangeHandler = null;
    const connection = getConnection();
    if (connection) {
        connectionChangeHandler = () => {
            const info = getConnectionInfo();
            console.log('📶 Connection changed:', info.effectiveType);
            
            if (isSlowConnection()) {
                console.warn('⚠️ Slow connection detected:', info.effectiveType);
            }
        };
        connection.addEventListener('change', connectionChangeHandler);
    }
    
    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (connectionChangeHandler && connection) {
            connection.removeEventListener('change', connectionChangeHandler);
        }
    };
};

/**
 * Get recommended timeout based on connection speed
 */
export const getRecommendedTimeout = () => {
    const connectionInfo = getConnectionInfo();
    
    switch (connectionInfo.effectiveType) {
        case 'slow-2g':
            return 30000; // 30 seconds
        case '2g':
            return 25000; // 25 seconds
        case '3g':
            return 15000; // 15 seconds
        case '4g':
        case '5g':
            return 10000; // 10 seconds
        default:
            return 15000; // 15 seconds (safe default)
    }
};

/**
 * Show network warning if connection is poor
 */
export const shouldShowNetworkWarning = () => {
    if (!navigator.onLine) {
        return {
            show: true,
            message: 'You appear to be offline. Please check your connection.'
        };
    }
    
    if (isSlowConnection()) {
        const info = getConnectionInfo();
        return {
            show: true,
            message: `Slow connection detected (${info.effectiveType}). Loading may take longer.`
        };
    }
    
    return {
        show: false,
        message: null
    };
};

export default {
    isOnline,
    isSlowConnection,
    getConnectionInfo,
    testNetworkConnectivity,
    waitForOnline,
    setupNetworkListeners,
    getRecommendedTimeout,
    shouldShowNetworkWarning
};

