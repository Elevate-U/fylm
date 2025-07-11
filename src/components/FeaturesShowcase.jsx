import { h } from 'preact';
import { Link } from 'preact-router';
import './FeaturesShowcase.css';

const FeaturesShowcase = () => {
    const features = [
        {
            icon: '⏯️',
            title: 'Continue Watching',
            description: 'Pick up exactly where you left off across all your devices. Never lose your place again.',
            highlight: true
        },
        {
            icon: '❤️',
            title: 'Favorites Collection',
            description: 'Save your favorite movies and TV shows in one place for quick access anytime.',
            highlight: false
        },
        {
            icon: '📚',
            title: 'Watch History',
            description: 'Keep track of everything you\'ve watched and easily find content you enjoyed.',
            highlight: false
        },
        {
            icon: '🎯',
            title: 'Personal Progress',
            description: 'Sync your watch progress across devices and resume on any screen seamlessly.',
            highlight: false
        },
        {
            icon: '🔍',
            title: 'Smart Recommendations',
            description: 'Get personalized suggestions based on your viewing history and preferences.',
            highlight: false
        },
        {
            icon: '⚡',
            title: 'Enhanced Experience',
            description: 'Unlock the full potential of FreeStream with user-specific features and settings.',
            highlight: false
        }
    ];

    return (
        <div class="features-showcase">
            <div class="features-hero">
                <div class="features-hero-content">
                    <h2 class="features-title">
                        <span class="gradient-text">Sign in for the full experience</span>
                    </h2>
                    <p class="features-subtitle">
                        Get personalized recommendations, track your progress, and never lose your place
                    </p>
                </div>
            </div>
            
            <div class="features-grid">
                {features.map((feature, index) => (
                    <div key={index} class={`feature-card ${feature.highlight ? 'featured' : ''}`}>
                        <div class="feature-icon">{feature.icon}</div>
                        <h3 class="feature-title">{feature.title}</h3>
                        <p class="feature-description">{feature.description}</p>
                    </div>
                ))}
            </div>
            
            <div class="features-footer">
                <div class="features-stats">
                    <div class="stat">
                        <span class="stat-number">10K+</span>
                        <span class="stat-label">Movies & Shows</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">4K</span>
                        <span class="stat-label">Ultra HD Quality</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">∞</span>
                        <span class="stat-label">Unlimited Access</span>
                    </div>
                </div>
                <p class="features-note">
                    <Link href="/login" class="subtle-link">Sign in</Link> or <Link href="/signup" class="subtle-link">create an account</Link> to unlock these features
                </p>
            </div>
        </div>
    );
};

export default FeaturesShowcase; 