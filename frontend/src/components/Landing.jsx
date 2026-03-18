function Landing({ onGetStarted }) {
  return (
    <div className="landing">

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src="/usf-logo.svg" alt="University of South Florida" className="usf-logo-nav" />
            <div className="logo-text-group">
              <span className="logo-university-name">University of South Florida</span>
              <span className="logo-divider"></span>
              <span className="logo-app-name">ALIGN Ethics Toolkit</span>
            </div>
          </div>
          <div className="nav-right">
            <button className="btn-nav-signin" onClick={onGetStarted}>Sign In →</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-bg-pattern"></div>
        <div className="hero-inner">
          <div className="hero-product-label">
            <span className="hero-product-name">ALIGN</span>
            <span className="hero-product-expanded">AI Lifecycle Integrity &amp; Governance Navigator</span>
          </div>
          <h1 className="hero-title">
            Navigate AI Ethics<br />
            <span className="hero-title-accent">With Confidence</span>
          </h1>
          <p className="hero-subtitle">
            Structured compliance guidance for researchers and teams —
            from IRB review to disclosure documentation.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={onGetStarted}>
              Get Started Free
              <span className="btn-arrow">→</span>
            </button>
            <a className="btn-hero-secondary" href="#how-it-works">
              <span className="play-icon">▶</span>
              See How It Works
            </a>
          </div>
          <p className="hero-note">🔒 Restricted to USF accounts (@usf.edu)</p>
        </div>

        <div className="hero-visual">
          <div className="hero-card-stack">
            {/* Main compliance card */}
            <div className="hc-main">
              <div className="hc-top">
                <div className="hc-project-info">
                  <span className="hc-label">Active Project</span>
                  <span className="hc-project-name">AI-Assisted Grading Study</span>
                </div>
                <span className="hc-status-badge">In Progress</span>
              </div>
              <div className="hc-progress-section">
                <div className="hc-progress-row">
                  <span>Compliance</span>
                  <span className="hc-pct">40%</span>
                </div>
                <div className="hc-bar">
                  <div className="hc-bar-fill" style={{ width: '40%' }}></div>
                </div>
              </div>
              <div className="hc-checkpoints">
                <div className="hc-cp done">
                  <span className="hc-cp-icon">✓</span>
                  <span>IRB Status Confirmed</span>
                  <span className="hc-cp-date">Mar 1</span>
                </div>
                <div className="hc-cp done">
                  <span className="hc-cp-icon">✓</span>
                  <span>Data Classification</span>
                  <span className="hc-cp-date">Mar 3</span>
                </div>
                <div className="hc-cp current">
                  <span className="hc-cp-icon pulse">●</span>
                  <span>AI Disclosure Planned</span>
                  <span className="hc-cp-tag">Due now</span>
                </div>
                <div className="hc-cp pending">
                  <span className="hc-cp-icon">○</span>
                  <span>Bias Audit</span>
                  <span className="hc-cp-tag dim">Upcoming</span>
                </div>
                <div className="hc-cp pending">
                  <span className="hc-cp-icon">○</span>
                  <span>Human Review Process</span>
                  <span className="hc-cp-tag dim">Upcoming</span>
                </div>
              </div>
            </div>
            {/* Floating doc card */}
            <div className="hc-float doc-card">
              <span className="fc-icon">📄</span>
              <div>
                <div className="fc-title">IRB Amendment</div>
                <div className="fc-sub">Ready to generate</div>
              </div>
            </div>
            {/* Floating risk card */}
            <div className="hc-float risk-card">
              <span className="risk-dot"></span>
              <div>
                <div className="fc-title">Risk Level</div>
                <div className="fc-sub risk-medium">Medium — Action Required</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-item-bar">
            <span className="stat-num">61%</span>
            <span className="stat-desc">of faculty use AI in teaching</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item-bar">
            <span className="stat-num">68%</span>
            <span className="stat-desc">have no formal AI ethics training</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item-bar">
            <span className="stat-num">61%</span>
            <span className="stat-desc">of institutions lack AI policies</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item-bar">
            <span className="stat-num">8</span>
            <span className="stat-desc">research scenarios covered</span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="landing-how" id="how-it-works">
        <div className="section-inner">
          <div className="section-label">HOW IT WORKS</div>
          <h2 className="section-title">From confusion to compliance<br />in three steps</h2>
          <div className="steps-grid">
            <div className="landing-step-card">
              <div className="lsc-number">01</div>
              <div className="lsc-body">
                <h3>Describe Your AI Use</h3>
                <p>Tell ALIGN what you're using AI for — analyzing interviews, writing grants, grading papers. The ethics engine identifies exactly which compliance rules apply to your situation.</p>
              </div>
              <div className="lsc-arrow">→</div>
            </div>
            <div className="landing-step-card">
              <div className="lsc-number">02</div>
              <div className="lsc-body">
                <h3>Work Through Checkpoints</h3>
                <p>Get a personalized checklist of compliance steps — IRB review, data de-identification, disclosure planning. Log what you did for each one. Everything is tracked and timestamped.</p>
              </div>
              <div className="lsc-arrow">→</div>
            </div>
            <div className="landing-step-card">
              <div className="lsc-number">03</div>
              <div className="lsc-body">
                <h3>Generate Documents</h3>
                <p>When you're ready, generate IRB amendments, FERPA checklists, disclosure statements, and reproducibility logs — pre-filled based on your project details.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="landing-who">
        <div className="section-inner">
          <div className="section-label">BUILT FOR</div>
          <h2 className="section-title">Designed around how<br />research teams actually work</h2>
          <div className="who-grid">
            <div className="who-card">
              <div className="who-card-header">
                <div className="who-icon">👩‍🏫</div>
                <h3>Faculty & Principal Investigators</h3>
              </div>
              <ul>
                <li>Understand IRB implications of AI use in your protocol</li>
                <li>Get publication-ready AI disclosure language</li>
                <li>Review compliance status across your research team</li>
                <li>Generate IRB amendment templates in minutes</li>
              </ul>
              <div className="who-card-footer">
                <span className="role-tag pi">Faculty / PI</span>
              </div>
            </div>
            <div className="who-card">
              <div className="who-card-header">
                <div className="who-icon">🎓</div>
                <h3>Graduate Students & Researchers</h3>
              </div>
              <ul>
                <li>Know exactly what de-identification is required</li>
                <li>Understand FERPA compliance for student data</li>
                <li>Document AI use for reproducibility and transparency</li>
                <li>Complete checkpoints assigned to your role</li>
              </ul>
              <div className="who-card-footer">
                <span className="role-tag student">Student</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenarios */}
      <section className="landing-scenarios">
        <div className="section-inner">
          <div className="section-label">COVERAGE</div>
          <h2 className="section-title">Research scenarios we cover</h2>
          <p className="section-sub">The ethics decision tree produces tailored compliance guidance for each use case.</p>
          <div className="scenario-grid">
            {[
              { icon: '🎙', label: 'Qualitative Data Analysis' },
              { icon: '📚', label: 'Literature Review & Synthesis' },
              { icon: '✍️', label: 'Writing & Editing Assistance' },
              { icon: '📊', label: 'Quantitative / Statistical Analysis' },
              { icon: '💰', label: 'Grant Proposal Writing' },
              { icon: '🧑‍🏫', label: 'Teaching Material Development' },
              { icon: '📝', label: 'Student Assessment & Feedback' },
              { icon: '💻', label: 'Research Code Generation' },
            ].map((s) => (
              <div className="scenario-card" key={s.label}>
                <span className="sc-icon">{s.icon}</span>
                <span className="sc-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="cta-inner">
          <div className="cta-glow"></div>
          <div className="section-label light">GET STARTED</div>
          <h2>Ready to use AI responsibly?</h2>
          <p>Create your account with a USF email and set up your first compliance project in under 5 minutes.</p>
          <button className="btn-hero-primary large" onClick={onGetStarted}>
            Create Your Account
            <span className="btn-arrow">→</span>
          </button>
          <p className="cta-note">Free for all USF researchers · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <img src="/usf-logo.svg" alt="University of South Florida" className="usf-logo-footer" />
              <div className="footer-brand-text">
                <div className="footer-university-name">University of South Florida</div>
                <div className="footer-app-name">ALIGN Ethics Toolkit</div>
              </div>
            </div>
            <div className="footer-contact">
              <div className="footer-address">4202 E. Fowler Avenue, Tampa, FL 33620</div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>Copyright &copy; 2026, University of South Florida. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Landing;
