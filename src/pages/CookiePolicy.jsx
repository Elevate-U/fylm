import { h } from 'preact';
import { Link } from 'preact-router/match';
import './Auth.css';

const CookiePolicy = () => {
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px' }}>
        <div className="auth-header">
          <h1>Cookie Policy</h1>
          <p>Last updated: October 3, 2025</p>
        </div>
        
        <div className="cookie-content" style={{ textAlign: 'left', lineHeight: '1.8', padding: '0 1rem' }}>
          <section style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
              This Cookie Policy explains how Fylm uses cookies and similar tracking technologies to 
              recognize you when you visit our Service. It explains what these technologies are, why 
              we use them, and your rights to control their use.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device (computer, smartphone, tablet) 
              when you visit a website. They are widely used to make websites work more efficiently and 
              provide information to website owners.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Cookies serve various purposes, such as:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Remembering your login credentials and preferences</li>
              <li>Analyzing how you use our Service to improve functionality</li>
              <li>Providing personalized content and recommendations</li>
              <li>Ensuring security and preventing fraud</li>
              <li>Understanding user behavior through analytics</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>2. Types of Cookies We Use</h2>
            
            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>2.1 Essential Cookies (Strictly Necessary)</h3>
            <p>
              These cookies are necessary for the Service to function and cannot be switched off. They 
              are usually set in response to actions you take, such as logging in or setting privacy 
              preferences.
            </p>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>Examples:</strong></p>
              <ul style={{ paddingLeft: '2rem', marginTop: '0.5rem' }}>
                <li><code>sb-access-token</code> - Supabase authentication token</li>
                <li><code>sb-refresh-token</code> - Session refresh token</li>
                <li><code>session-id</code> - Unique session identifier</li>
                <li><code>user-preferences</code> - Your settings and preferences</li>
              </ul>
              <p style={{ marginTop: '0.75rem' }}><strong>Duration:</strong> Session or up to 7 days</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Purpose:</strong> Authentication, security, session management</p>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>2.2 Performance Cookies</h3>
            <p>
              These cookies collect information about how visitors use our Service, such as which pages 
              are visited most often and if users receive error messages. These cookies don't collect 
              information that identifies individual visitors.
            </p>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>Examples:</strong></p>
              <ul style={{ paddingLeft: '2rem', marginTop: '0.5rem' }}>
                <li><code>_ga</code> - Google Analytics visitor ID</li>
                <li><code>_gid</code> - Google Analytics session ID</li>
                <li><code>analytics-session</code> - Internal analytics tracking</li>
              </ul>
              <p style={{ marginTop: '0.75rem' }}><strong>Duration:</strong> Up to 2 years</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Purpose:</strong> Analytics, performance monitoring, error tracking</p>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>2.3 Functional Cookies</h3>
            <p>
              These cookies enable the Service to provide enhanced functionality and personalization. 
              They may be set by us or by third-party providers whose services we use on our pages.
            </p>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>Examples:</strong></p>
              <ul style={{ paddingLeft: '2rem', marginTop: '0.5rem' }}>
                <li><code>theme-preference</code> - Light/dark mode selection</li>
                <li><code>language</code> - Language preference</li>
                <li><code>video-quality</code> - Video playback quality preference</li>
                <li><code>subtitle-settings</code> - Subtitle preferences</li>
              </ul>
              <p style={{ marginTop: '0.75rem' }}><strong>Duration:</strong> Up to 1 year</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Purpose:</strong> Personalization, user experience enhancement</p>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>2.4 Targeting/Advertising Cookies</h3>
            <p>
              We currently do not use advertising cookies. However, if we introduce advertising in the 
              future, these cookies would be used to deliver relevant advertisements and track campaign 
              performance. We would update this policy and obtain your consent before implementing such cookies.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>3. Other Tracking Technologies</h2>
            
            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.1 Local Storage</h3>
            <p>
              Local Storage is similar to cookies but can store more data and doesn't expire 
              automatically. We use Local Storage to:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Cache data for offline functionality</li>
              <li>Store user preferences and settings</li>
              <li>Improve application performance</li>
              <li>Save watch progress and history</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.2 Session Storage</h3>
            <p>
              Session Storage is similar to Local Storage but data is cleared when the browser tab is 
              closed. We use it for:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Temporary session data</li>
              <li>Form data preservation</li>
              <li>Navigation state management</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.3 Web Beacons and Pixels</h3>
            <p>
              Web beacons (also known as pixel tags) are tiny graphics with unique identifiers that 
              track user activity. We may use them to:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Track email opens and engagement</li>
              <li>Measure campaign effectiveness</li>
              <li>Understand user navigation patterns</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>3.4 IndexedDB</h3>
            <p>
              IndexedDB is a low-level API for storing significant amounts of structured data. We use 
              it for:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Caching content metadata</li>
              <li>Offline data synchronization</li>
              <li>Large dataset storage for improved performance</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>4. Third-Party Cookies</h2>
            <p>
              Some cookies on our Service are placed by third-party services we use. These include:
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>4.1 Supabase</h3>
            <p>
              Our authentication and database provider. Cookies used for:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem' }}>
              <li>User authentication and session management</li>
              <li>Secure data transmission</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                Supabase Privacy Policy ↗
              </a>
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>4.2 Content APIs</h3>
            <p>
              We use third-party APIs for content metadata:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem' }}>
              <li><strong>TMDB:</strong> Movie and TV show information</li>
              <li><strong>Consumet:</strong> Anime streaming information</li>
              <li><strong>Shikimori:</strong> Anime database and ratings</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              These services may set their own cookies when you access content through our platform.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>4.3 Analytics Services</h3>
            <p>
              We may use analytics services like Google Analytics to understand how users interact 
              with our Service. These services use cookies to collect usage data.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>5. How Long Do Cookies Last?</h2>
            <p>Cookies have different lifespans:</p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.1 Session Cookies</h3>
            <p>
              These are temporary cookies that expire when you close your browser. They help maintain 
              your session while navigating the Service.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>5.2 Persistent Cookies</h3>
            <p>
              These remain on your device for a set period or until you delete them. They remember 
              your preferences across visits. Our persistent cookies typically last:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>Authentication:</strong> 7 days</li>
              <li><strong>Preferences:</strong> 1 year</li>
              <li><strong>Analytics:</strong> 2 years</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>6. How to Control Cookies</h2>
            <p>You have several options to manage and control cookies:</p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>6.1 Browser Settings</h3>
            <p>
              Most browsers allow you to control cookies through their settings. You can:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Block all cookies</li>
              <li>Accept only first-party cookies</li>
              <li>Delete cookies after each session</li>
              <li>Make exceptions for specific websites</li>
            </ul>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>Browser-Specific Instructions:</strong></p>
              <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem' }}>
                <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
              </ul>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>6.2 Our Cookie Preferences</h3>
            <p>
              You can manage your cookie preferences through your account settings on our platform. 
              Navigate to <Link href="/profile" style={{ color: 'var(--primary-color)' }}>Profile → Privacy Settings</Link> to adjust your preferences.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>6.3 Opt-Out Tools</h3>
            <p>
              For analytics cookies, you can opt out using:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                  Google Analytics Opt-out Browser Add-on ↗
                </a>
              </li>
              <li>
                <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                  Digital Advertising Alliance Opt-Out Tool ↗
                </a>
              </li>
              <li>
                <a href="http://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                  Your Online Choices (EU) ↗
                </a>
              </li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', marginTop: '1.25rem', marginBottom: '0.75rem' }}>6.4 Mobile Device Settings</h3>
            <p>
              On mobile devices, you can control tracking through:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li><strong>iOS:</strong> Settings → Privacy → Tracking → Disable "Allow Apps to Request to Track"</li>
              <li><strong>Android:</strong> Settings → Google → Ads → Opt out of Ads Personalization</li>
            </ul>

            <div style={{ 
              background: 'rgba(255, 200, 0, 0.1)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid rgba(255, 200, 0, 0.3)'
            }}>
              <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                <strong>⚠️ IMPORTANT:</strong> Blocking or deleting essential cookies may prevent you 
                from using certain features of our Service, such as logging in or saving your preferences.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>7. Cookies and Personal Data</h2>
            <p>
              Some cookies contain personal information. For example, if you click "Remember Me" when 
              logging in, a cookie will store your username. Most cookies don't directly identify you 
              but provide a more personalized experience.
            </p>
            <p style={{ marginTop: '1rem' }}>
              For more information about how we handle personal data, please see our <Link href="/privacy-policy" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>8. Updates to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in technology, 
              legislation, or our data practices. We will notify you of any significant changes by:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>Posting the updated policy with a new "Last updated" date</li>
              <li>Displaying a notice on our Service</li>
              <li>Sending you an email notification (if you've opted in)</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              We encourage you to review this Cookie Policy periodically to stay informed about how 
              we use cookies and similar technologies.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>9. Contact Us</h2>
            <p>
              If you have questions or concerns about our use of cookies or this Cookie Policy, please 
              contact us:
            </p>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p><strong>Email:</strong> <a href="mailto:fylm.show@gmail.com" style={{ color: 'var(--primary-color)' }}>fylm.show@gmail.com</a></p>
              <p style={{ marginTop: '0.5rem' }}><strong>Subject Line:</strong> Cookie Policy Inquiry</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Response Time:</strong> We typically respond within 3-5 business days</p>
            </div>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>10. Useful Resources</h2>
            <p>
              To learn more about cookies and online privacy, visit these resources:
            </p>
            <ul style={{ paddingLeft: '2rem', marginTop: '0.75rem', lineHeight: '2' }}>
              <li>
                <a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                  All About Cookies ↗
                </a>
              </li>
              <li>
                <a href="https://www.cookiechoices.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                  Cookie Choices ↗
                </a>
              </li>
              <li>
                <a href="https://ico.org.uk/for-the-public/online/cookies/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                  ICO Cookies Guidance ↗
                </a>
              </li>
            </ul>
          </section>

          <section style={{ 
            marginTop: '3rem', 
            padding: '1.5rem', 
            background: 'rgba(0, 150, 255, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(0, 150, 255, 0.3)'
          }}>
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Quick Summary</h3>
            <ul style={{ paddingLeft: '2rem', lineHeight: '2' }}>
              <li>✓ We use cookies to improve your experience and keep you logged in</li>
              <li>✓ Essential cookies are required for the Service to work properly</li>
              <li>✓ You can control non-essential cookies through browser settings</li>
              <li>✓ We don't sell your data or use cookies for advertising (currently)</li>
              <li>✓ Third-party services we use may set their own cookies</li>
            </ul>
          </section>
        </div>
        
        <div className="auth-footer" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <Link href="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '1rem' }}>
              ← Back to Home
            </Link>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link href="/privacy-policy" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '1rem' }}>
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '1rem' }}>
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;






