import { h, render } from 'preact';
import App from './App';
import './index.css'; // We'll create this file next
import { startBackgroundSessionRefresh } from './supabase';

// Start background session refresh as soon as app loads
startBackgroundSessionRefresh();

render(<App />, document.getElementById('app')); 