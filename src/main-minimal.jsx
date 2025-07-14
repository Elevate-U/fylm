import { h, render } from 'preact';
import App from './App-minimal';
import './index.css';

console.log('🚀 Starting minimal test...');

// Simple error handler
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

render(<App />, document.getElementById('app'));
console.log('✅ Minimal app rendered');