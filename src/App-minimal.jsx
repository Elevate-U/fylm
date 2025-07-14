import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';

// Simple minimal app to test if basic rendering works
const Home = () => (
    <div style="padding: 20px; text-align: center;">
        <h1>🎬 FreeStream</h1>
        <p>Welcome to FreeStream!</p>
        <p>If you see this, the app is working correctly.</p>
    </div>
);

const About = () => (
    <div style="padding: 20px; text-align: center;">
        <h1>About</h1>
        <p>This is a test page.</p>
    </div>
);

const App = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.log('🚀 Minimal App mounted');
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style="padding: 20px; text-align: center;">Loading...</div>;
    }

    return (
        <div class="app">
            <main>
                <Router history={createHashHistory()}>
                    <Home path="/" />
                    <About path="/about" />
                </Router>
            </main>
        </div>
    );
};

export default App;