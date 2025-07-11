import { h } from 'preact';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
    const sizeClass = {
        small: 'spinner-small',
        medium: 'spinner-medium',
        large: 'spinner-large'
    }[size];

    return (
        <div class="loading-container">
            <div class={`loading-spinner ${sizeClass}`}>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
            </div>
            {text && <p class="loading-text">{text}</p>}
        </div>
    );
};

export default LoadingSpinner; 