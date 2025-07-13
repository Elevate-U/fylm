import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import LoadingSpinner from './LoadingSpinner';

const asyncComponent = (loadComponent) => {
    return (props) => {
        const [Component, setComponent] = useState(null);

        useEffect(() => {
            loadComponent().then(module => {
                setComponent(() => module.default);
            });
        }, []);

        return Component ? <Component {...props} /> : <LoadingSpinner />;
    };
};

export default asyncComponent;