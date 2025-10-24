import { h } from 'preact';
import { Link } from 'preact-router/match';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    
    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer class="app-footer" role="contentinfo">
            <div class="footer-content">
                <div class="footer-brand">
                    <Link href="/" class="logo" aria-label="Fylm - Go to homepage">Fylm</Link>
                    <p>Your gateway to unlimited entertainment. Built with passion for movie and anime lovers worldwide.</p>
        
                </div>
                
                <nav class="footer-links" role="navigation" aria-label="Footer navigation">
                    <div class="footer-section">
                        <h4>Platform</h4>
                        <ul role="list">
                            <li><Link href="/" class="footer-legal-link">Home</Link></li>
                            <li><Link href="/movies" class="footer-legal-link">Movies</Link></li>
                            <li><Link href="/anime" class="footer-legal-link">Anime</Link></li>
                            <li><Link href="/search" class="footer-legal-link">Search</Link></li>
                            <li><Link href="/blog" class="footer-legal-link">Blog</Link></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Account</h4>
                        <ul role="list">
                            <li><Link href="/login" class="footer-legal-link">Login</Link></li>
                            <li><Link href="/signup" class="footer-legal-link">Sign Up</Link></li>
                            <li><Link href="/profile" class="footer-legal-link">Profile</Link></li>
                            <li><Link href="/favorites" class="footer-legal-link">Favorites</Link></li>
                            <li><Link href="/history" class="footer-legal-link">Watch History</Link></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Support</h4>
                        <ul role="list">
                            <li><a href="mailto:fylm.show@gmail.com" class="footer-legal-link">Contact Support</a></li>
                            <li><Link href="/help" class="footer-legal-link">Help Center</Link></li>
                            <li><a href="#" class="footer-legal-link" onClick={() => window.location.reload()}>Report Issue</a></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Legal</h4>
                        <ul role="list">
                            <li><Link href="/terms-of-service" class="footer-legal-link">Terms of Service</Link></li>
                            <li><Link href="/privacy-policy" class="footer-legal-link">Privacy Policy</Link></li>
                            <li><Link href="/cookie-policy" class="footer-legal-link">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </nav>
            </div>
            
            <div class="footer-bottom">
                <div class="footer-bottom-left">
                    <p>&copy; {currentYear} Fylm. All Rights Reserved.</p>
                    <p class="disclaimer">Educational project - Not a real streaming service.</p>
                </div>
                
                <div class="footer-socials" role="group" aria-label="Social media links">
                    <a 
                        href="https://x.com/FylmStream" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="Follow Fylm on X (Twitter)"
                        title="Follow us on X"
                    >
                        <i class="fab fa-twitter" aria-hidden="true"></i>
                        <span class="sr-only">X (Twitter)</span>
                    </a>
                    <a 
                        href="https://github.com/fylm-dev" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="View Fylm source code on GitHub"
                        title="View source on GitHub"
                    >
                        <i class="fab fa-github" aria-hidden="true"></i>
                        <span class="sr-only">GitHub</span>
                    </a>
                    <a 
                        href="https://discord.gg/fylm" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        aria-label="Join Fylm Discord community"
                        title="Join our Discord"
                    >
                        <i class="fab fa-discord" aria-hidden="true"></i>
                        <span class="sr-only">Discord</span>
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;