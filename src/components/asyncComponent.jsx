import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import LoadingSpinner from './LoadingSpinner';

const asyncComponent = (loadComponent) => {
    return (props) => {
        const [Component, setComponent] = useState(null);
        const [error, setError] = useState(null);

        useEffect(() => {
            loadComponent()
                .then(module => {
                    setComponent(() => module.default);
                })
                .catch(err => {
                    console.error('Failed to load component:', err);
                    setError(err);
                });
        }, []);

        if (error) {
            return <div style="padding: 20px; text-align: center; color: #ff6b6b;">
                Error loading component
            </div>;
        }

        return Component ? <Component {...props} /> : <LoadingSpinner />;
    };
};

export default asyncComponent;