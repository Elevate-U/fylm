import { h, render } from 'preact';
import App from './App-debug';
import './index.css';

console.log('🚀 Starting debug version...');

// Add error boundary for debugging
class ErrorBoundary extends preact.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('🚨 Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style="padding: 20px; background: #ffebee; color: #c62828;">
                    <h2>🚨 Something went wrong</h2>
                    <pre>{this.state.error?.stack || this.state.error?.message}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

// Render with error boundary
render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>,
    document.getElementById('app')
);

console.log('✅ Debug app rendered');