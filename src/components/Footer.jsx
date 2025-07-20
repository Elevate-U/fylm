import { h } from 'preact';
import { Link } from 'preact-router/match';
import './Footer.css';

const Footer = () => (
    <footer class="app-footer">
        <div class="footer-content">
            <div class="footer-brand">
                <Link href="/" class="logo">Fylm</Link>
                <p>Your gateway to unlimited entertainment. Built with passion.</p>
            </div>
            <div class="footer-links">
                <div class="footer-section">
                    <h4>Platform</h4>
                    <ul>
                        <li><Link href="/" class="footer-legal-link">Home</Link></li>
                        <li><Link href="/movies" class="footer-legal-link">Movies</Link></li>
                        <li><Link href="/tv" class="footer-legal-link">TV Shows</Link></li>
                        <li><Link href="/blog" class="footer-legal-link">Blog</Link></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Account</h4>
                    <ul>
                        <li><Link href="/login" class="footer-legal-link">Login</Link></li>
                        <li><Link href="/signup" class="footer-legal-link">Sign Up</Link></li>
                        <li><Link href="/favorites" class="footer-legal-link">Favorites</Link></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Legal</h4>
                    <ul>
                        <li><Link href="/terms-of-service" class="footer-legal-link">Terms of Service</Link></li>
                        <li><Link href="/privacy-policy" class="footer-legal-link">Privacy Policy</Link></li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2024 Fylm. All Rights Reserved. Not a real streaming service.</p>
            <div class="footer-socials">
                <a href="https://x.com/FylmStream" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X"><i class="fab fa-twitter"></i></a>
                <a href="https://x.com/FylmStream" target="_blank" rel="noopener noreferrer" aria-label="Github"><i class="fab fa-github"></i></a>
            </div>
        </div>
    </footer>
);

export default Footer;