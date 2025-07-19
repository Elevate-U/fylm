import { h } from 'preact';
import './Auth.css'; // Reuse auth styling for consistency

const TermsOfService = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Terms of Service</h1>
          <p>Last updated: January 2025</p>
        </div>
        
        <div className="terms-content" style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using Fylm, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>2. Service Description</h2>
            <p>Fylm is a demonstration streaming platform built for educational purposes. This is not a real streaming service and does not provide actual copyrighted content.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>3. User Accounts</h2>
            <p>You are responsible for safeguarding the password and for maintaining the confidentiality of your account. You agree not to disclose your password to any third party.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>4. Prohibited Uses</h2>
            <p>You may not use our service:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>5. Disclaimer</h2>
            <p>This is a demonstration project. No actual streaming content is provided. All content references are for educational and demonstration purposes only.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>6. Contact Information</h2>
            <p>If you have any questions about these Terms of Service, please contact us through our support channels.</p>
          </section>
        </div>
        
        <div className="auth-footer">
          <p><a href="/" style={{ color: 'var(--primary-color)' }}>← Back to Home</a></p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;