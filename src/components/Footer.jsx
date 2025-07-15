import { h } from 'preact';
import { Link } from 'preact-router/match';
import './Footer.css';

const Footer = () => (
    <footer class="app-footer">
        <div class="footer-content">
            <div class="footer-brand">
                <Link href="/" class="logo">Fovi</Link>
                <p>Your gateway to unlimited entertainment. Built with passion.</p>
            </div>
            <div class="footer-links">
                <div class="footer-section">
                    <h4>Platform</h4>
                    <ul>
                        <li><Link href="/">Home</Link></li>
                        <li><Link href="/movies">Movies</Link></li>
                        <li><Link href="/tv">TV Shows</Link></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Account</h4>
                    <ul>
                        <li><Link href="/login">Login</Link></li>
                        <li><Link href="/signup">Sign Up</Link></li>
                        <li><Link href="/favorites">Favorites</Link></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2024 Fovi. All Rights Reserved. Not a real streaming service.</p>
            <div class="footer-socials">
                <a href="#" aria-label="Github"><i class="fab fa-github"></i></a>
                <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
            </div>
        </div>
    </footer>
);

export default Footer; 