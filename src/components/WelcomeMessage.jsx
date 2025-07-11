import { h } from 'preact';
import { useAuth } from '../context/Auth';
import './WelcomeMessage.css';

const WelcomeMessage = () => {
    const { user } = useAuth();
    
    if (!user) return null;

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const getFirstName = () => {
        if (user.user_metadata?.full_name) {
            return user.user_metadata.full_name.split(' ')[0];
        }
        return user.email.split('@')[0];
    };

    return (
        <div class="welcome-message">
            <div class="welcome-content">
                <h2 class="welcome-title">
                    {getTimeGreeting()}, <span class="user-name">{getFirstName()}</span>!
                </h2>
                <p class="welcome-subtitle">
                    What would you like to watch today?
                </p>
            </div>
            <div class="welcome-stats">
                <div class="stat-item">
                    <span class="stat-icon">🎬</span>
                    <span class="stat-text">Unlimited Movies</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">📺</span>
                    <span class="stat-text">TV Shows</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">⚡</span>
                    <span class="stat-text">HD Streaming</span>
                </div>
            </div>
        </div>
    );
};

export default WelcomeMessage; 