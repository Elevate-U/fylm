import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', showTimeout = true }) => {
    const [showWarning, setShowWarning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    
    const sizeClass = {
        small: 'spinner-small',
        medium: 'spinner-medium',
        large: 'spinner-large'
    }[size];

    useEffect(() => {
        if (!showTimeout) return;
        
        // Show warning after 10 seconds
        const warningTimer = setTimeout(() => {
            setShowWarning(true);
        }, 10000);
        
        // Update elapsed time every second
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        
        return () => {
            clearTimeout(warningTimer);
            clearInterval(interval);
        };
    }, [showTimeout]);

    return (
        <div class="loading-container">
            <div class={`loading-spinner ${sizeClass}`}>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
            </div>
            {text && <p class="loading-text">{text}</p>}
            {showWarning && elapsedTime > 10 && (
                <div class="loading-warning">
                    <p style="color: #ffa500; margin-top: 1rem; font-size: 0.9rem;">
                        Taking longer than usual... ({elapsedTime}s)
                    </p>
                    <p style="color: #999; font-size: 0.8rem; margin-top: 0.5rem;">
                        Please check your connection or try refreshing
                    </p>
                </div>
            )}
        </div>
    );
};

export default LoadingSpinner; 