import { h } from 'preact';
import './Auth.css'; // Reuse auth styling for consistency

const PrivacyPolicy = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: January 2025</p>
        </div>
        
        <div className="privacy-content" style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support.</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Account information (email, username, profile picture)</li>
              <li>Usage data (watch history, favorites, preferences)</li>
              <li>Device information (browser type, IP address, device identifiers)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>3. Information Sharing</h2>
            <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>4. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>5. Cookies and Tracking</h2>
            <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve user experience.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of certain communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>7. Demo Notice</h2>
            <p>This is a demonstration project. While we follow privacy best practices, this service is not intended for production use with real user data.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>8. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us through our support channels.</p>
          </section>
        </div>
        
        <div className="auth-footer">
          <p><a href="/" style={{ color: 'var(--primary-color)' }}>← Back to Home</a></p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;