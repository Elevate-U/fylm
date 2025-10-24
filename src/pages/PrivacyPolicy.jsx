import { h } from 'preact';
import { Link } from 'preact-router/match';
import './Auth.css';

const PrivacyPolicy = () => {
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px' }}>
        <div className="auth-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: October 3, 2025</p>
        </div>
        
        <div className="privacy-content" style={{ textAlign: 'left', lineHeight: '1.8', padding: '0 1rem' }}>
          <section style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
              At Fylm, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our service. Please read 
              this policy carefully.
            </p>
            <div style={{ 
              background: 'rgba(0, 150, 255, 0.1)', 
              padding: '1.25rem', 
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid rgba(0, 150, 255, 0.3)'
            }}>
              <p style={{ fontWeight: '600', marginBottom: '0.75rem' }}>
                📌 Important: Content Aggregation Service
              </p>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
                Fylm is a content aggregation platform that provides links to movies and TV shows hosted 
                on third-party servers. We do not host, store, or transmit any video content. This Privacy 
                Policy covers data we collect directly (account information, preferences, etc.) and does 
                not apply to third-party content providers whose services you access through our links.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>1. Information We Collect</h2>
            
            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>1.1 Information You Provide</h3>
            <p>We collect information that you voluntarily provide when using our Service:</p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Account Information:</strong> Email address, username, password (encrypted), and profile picture</li>
              <li><strong>Profile Data:</strong> Display name, bio, preferences, and settings</li>
              <li><strong>User-Generated Content:</strong> Reviews, comments, ratings, and watchlists</li>
              <li><strong>Communication Data:</strong> Messages, support tickets, and feedback you send us</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>1.2 Information Collected Automatically</h3>
            <p>When you access our Service, we automatically collect certain information:</p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Usage Data:</strong> Pages viewed, time spent, features used, search queries, and interaction patterns</li>
              <li><strong>Watch History:</strong> Content viewed, watch progress, timestamps, and viewing preferences</li>
              <li><strong>Device Information:</strong> Browser type and version, operating system, device type, screen resolution</li>
              <li><strong>Location Data:</strong> IP address, general geographic location (country/city level)</li>
              <li><strong>Log Data:</strong> Access times, error logs, performance data, and API requests</li>
              <li><strong>Cookies and Tracking:</strong> Session tokens, authentication data, and preferences (see our <Link href="/cookie-policy" style={{ color: 'var(--primary-color)' }}>Cookie Policy</Link>)</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>1.3 Information from Third Parties</h3>
            <p>We may receive information from third-party services:</p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Authentication Providers:</strong> When you sign in with third-party services (Google, GitHub, etc.)</li>
              <li><strong>Content APIs:</strong> Metadata from TMDB, Consumet, Shikimori, and other content providers</li>
              <li><strong>Analytics Services:</strong> Aggregated usage statistics and performance metrics</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>1.4 Third-Party Content Providers</h3>
            <p>
              <strong>Important:</strong> When you access video content through our platform, you are connecting 
              directly to third-party streaming servers that we do not control. These third-party providers 
              may collect their own data about you, including:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>IP address and viewing activity</li>
              <li>Device information and browser details</li>
              <li>Cookies and tracking data</li>
            </ul>
            <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              This Privacy Policy does not cover data collected by third-party content hosts. We recommend 
              reviewing their privacy policies and using appropriate privacy tools (VPN, ad-blockers) when 
              accessing external content.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            
            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>2.1 Service Provision</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Create and manage your account</li>
              <li>Authenticate your identity and maintain session security</li>
              <li>Provide personalized content recommendations</li>
              <li>Save your watch history and favorites</li>
              <li>Enable social features (profiles, ratings, reviews)</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>2.2 Service Improvement</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Analyze usage patterns to improve features and user experience</li>
              <li>Monitor and analyze performance metrics</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Develop new features and functionality</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>2.3 Communication</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Send service-related notifications and updates</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send security alerts and account notifications</li>
              <li>Provide information about new features (if you've opted in)</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>2.4 Security and Legal Compliance</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Protect against fraud, abuse, and security threats</li>
              <li>Enforce our Terms of Service</li>
              <li>Comply with legal obligations and regulations</li>
              <li>Resolve disputes and investigate violations</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>3. How We Share Your Information</h2>
            <p>We respect your privacy and do not sell your personal information. We may share your information in the following circumstances:</p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.1 Service Providers</h3>
            <p>
              We work with trusted third-party service providers who help us operate our Service:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Supabase:</strong> Authentication, database, and storage services</li>
              <li><strong>Vercel:</strong> Hosting and deployment infrastructure</li>
              <li><strong>Content APIs:</strong> TMDB, Consumet, Shikimori for content metadata</li>
              <li><strong>Analytics Providers:</strong> For usage analytics and performance monitoring</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              These providers are contractually obligated to protect your data and use it only for the services they provide to us.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.2 Legal Requirements</h3>
            <p>We may disclose your information if required by law or in response to:</p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Valid legal processes (subpoenas, court orders, legal proceedings)</li>
              <li>Law enforcement requests in accordance with applicable law</li>
              <li>National security or public safety requirements</li>
              <li>Protection of our rights, property, or safety</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.3 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, reorganization, or sale of assets, your information 
              may be transferred as part of that transaction. We will notify you of any such change and 
              any choices you may have regarding your information.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.4 With Your Consent</h3>
            <p>
              We may share your information with third parties when you explicitly consent to such sharing.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Encryption:</strong> All data in transit is encrypted using TLS/SSL protocols</li>
              <li><strong>Password Security:</strong> Passwords are hashed using bcrypt with salt</li>
              <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
              <li><strong>Regular Security Audits:</strong> Periodic security assessments and updates</li>
              <li><strong>Secure Infrastructure:</strong> Hosted on secure, monitored cloud platforms</li>
              <li><strong>Data Backups:</strong> Regular automated backups with encryption</li>
            </ul>
            <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              While we strive to protect your personal information, no method of transmission over the 
              Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>5. Your Privacy Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.1 Access and Portability</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Request access to your personal information</li>
              <li>Receive a copy of your data in a portable format</li>
              <li>View and download your watch history and favorites</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.2 Correction and Update</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Update your profile information at any time</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Modify your preferences and settings</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.3 Deletion (Right to be Forgotten)</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Delete your account and associated data</li>
              <li>Remove specific information from your profile</li>
              <li>Request erasure of your personal data (subject to legal obligations)</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.4 Opt-Out and Restriction</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Opt out of marketing communications</li>
              <li>Disable cookies and tracking (see our <Link href="/cookie-policy" style={{ color: 'var(--primary-color)' }}>Cookie Policy</Link>)</li>
              <li>Restrict certain processing of your data</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.5 Object and Withdraw Consent</h3>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Object to processing based on legitimate interests</li>
              <li>Withdraw consent for data processing (where applicable)</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>How to Exercise Your Rights:</strong></p>
              <p style={{ marginTop: '0.75rem' }}>
                To exercise any of these rights, please contact us at <a href="mailto:fylm.show@gmail.com" style={{ color: 'var(--primary-color)' }}>fylm.show@gmail.com</a> or 
                use the privacy controls in your account settings. We will respond to your request within 30 days.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide the Service and 
              fulfill the purposes outlined in this Privacy Policy. Specifically:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
              <li><strong>Deleted Accounts:</strong> Most data is deleted within 30 days of account deletion</li>
              <li><strong>Legal Obligations:</strong> Some data may be retained longer to comply with legal requirements</li>
              <li><strong>Backup Data:</strong> Data in backups may persist for up to 90 days</li>
              <li><strong>Anonymized Data:</strong> Aggregated, anonymized usage data may be retained indefinitely</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience. For detailed 
              information about the cookies we use and how to manage them, please see our <Link href="/cookie-policy" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>Cookie Policy</Link>.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Types of cookies we use:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
              <li><strong>Performance Cookies:</strong> Help us understand how you use the Service</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Analytics Cookies:</strong> Collect aggregated usage statistics</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country 
              of residence. These countries may have data protection laws that differ from those in your 
              jurisdiction.
            </p>
            <p style={{ marginTop: '1rem' }}>
              We ensure appropriate safeguards are in place to protect your information, including:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Standard Contractual Clauses approved by regulatory authorities</li>
              <li>Compliance with GDPR for European users</li>
              <li>Adherence to Privacy Shield principles (where applicable)</li>
              <li>Use of secure, compliant service providers</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>9. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under the age of 13 (or 16 in the European Economic Area). 
              We do not knowingly collect personal information from children.
            </p>
            <p style={{ marginTop: '1rem' }}>
              If we become aware that a child has provided us with personal information, we will take 
              steps to delete such information. If you believe a child has provided us with personal 
              information, please contact us immediately at <a href="mailto:fylm.show@gmail.com" style={{ color: 'var(--primary-color)' }}>fylm.show@gmail.com</a>.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>10. Do Not Track Signals</h2>
            <p>
              Some browsers include a "Do Not Track" (DNT) feature that signals to websites that you do 
              not want to be tracked. Currently, there is no industry standard for how to respond to DNT 
              signals. We do not currently respond to DNT browser signals but honor opt-out preferences 
              you set in your account settings.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>11. California Privacy Rights (CCPA)</h2>
            <p>
              If you are a California resident, you have specific rights under the California Consumer 
              Privacy Act (CCPA):
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information held by us</li>
              <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
              <li>Right to non-discrimination for exercising your CCPA rights</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              To exercise these rights, contact us at <a href="mailto:fylm.show@gmail.com" style={{ color: 'var(--primary-color)' }}>fylm.show@gmail.com</a> with 
              "California Privacy Rights" in the subject line.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>12. European Privacy Rights (GDPR)</h2>
            <p>
              If you are in the European Economic Area (EEA), you have rights under the General Data 
              Protection Regulation (GDPR):
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Right of access to your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Rights related to automated decision-making and profiling</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              You also have the right to lodge a complaint with your local supervisory authority.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>13. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, 
              technology, legal requirements, or other factors. We will notify you of any material 
              changes by:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Posting the updated policy on this page</li>
              <li>Updating the "Last updated" date at the top of this policy</li>
              <li>Sending an email notification for significant changes (if you've opted in)</li>
              <li>Displaying a prominent notice on our Service</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              Your continued use of the Service after any changes constitutes your acceptance of the 
              updated Privacy Policy.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>14. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our 
              data practices, please contact us:
            </p>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>Email:</strong> <a href="mailto:fylm.show@gmail.com" style={{ color: 'var(--primary-color)' }}>fylm.show@gmail.com</a></p>
              <p style={{ marginTop: '0.5rem' }}><strong>Subject Line:</strong> Privacy Inquiry</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Response Time:</strong> We will respond to your inquiry within 30 days</p>
            </div>
          </section>

          <section style={{ 
            marginTop: '3rem', 
            padding: '1.5rem', 
            background: 'rgba(255, 0, 100, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(255, 0, 100, 0.3)'
          }}>
            <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              🔒 YOUR PRIVACY AND SECURITY
            </p>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
              We are committed to protecting your personal data and follow privacy best practices. 
              However, please remember:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '1.8', fontSize: '0.95rem' }}>
              <li>Fylm only collects data related to your account and usage of our platform</li>
              <li>We do not collect or store data about the content you watch on third-party servers</li>
              <li>Third-party content providers may collect their own data - use privacy tools accordingly</li>
              <li>We never sell your personal information to third parties</li>
              <li>You have full control over your data and can delete your account at any time</li>
            </ul>
          </section>
        </div>
        
        <div className="auth-footer" style={{ marginTop: '2rem' }}>
          <p>
            <Link href="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '1rem' }}>
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
