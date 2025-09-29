import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, FileText, Wand2, Upload, Menu, X } from 'lucide-react';
import '../styles/landing.css';

export default function Landing() {
  const fullTitle = 'Land Your Dream Job with AI- Powered Interview and Resume Tools.';
  const [typed, setTyped] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(fullTitle.slice(0, i));
      if (i >= fullTitle.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-root">
      {/* Top Nav */}
      <header className="landing-nav">
        <div className="landing-container nav-inner">
          <div className="brand">
            <img src="/new_logo.png" alt="ResumeRefiner Logo" className="brand-logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <span className="brand-text">ResumeRefiner</span>
          </div>
          {/* Mobile nav toggle (hidden on desktop) */}
          <button
            className="nav-toggle"
            aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(o => !o)}
          >
            {isNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`nav-links ${isNavOpen ? 'open' : ''}`} onClick={() => setIsNavOpen(false)}>
            <a
              href="#features"
              className="nav-link"
              onClick={(e)=>{ e.preventDefault(); const el = document.getElementById('features'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Features
            </a>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn btn-dark sm">Sign Up for Free</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-container hero-inner">
          <h1 className="hero-title typewriter">
            {/* Hidden placeholder reserves the full height so content below doesn't shift */}
            <span className="hero-placeholder" aria-hidden="true">{fullTitle}</span>
            {/* Absolutely positioned animated text sits on top in the reserved space */}
            <span className="hero-animated">{typed}</span>
          </h1>
          <p className="hero-sub">
            Practice targeted interviews, chat with your resume, and get instant feedback to refine
            your application — powered by AI.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-dark">Sign Up for Free</Link>
            <a
              href="#how"
              className="btn btn-light"
              onClick={(e)=>{ e.preventDefault(); const el = document.getElementById('how'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <span className="icon">⏺</span>
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-sub">Everything you need to prepare with confidence and stand out in the hiring process.</p>

          <div className="feature-list">
            <div className="feature-card">
              <div className="feature-icon" aria-hidden>
                <MessageSquare style={{ width: 20, height: 20, color: '#374151' }} />
              </div>
              <div className="feature-body">
                <div className="feature-title">AI Mock Interviews</div>
                <div className="feature-desc">Practice interviews tailored to your job description.</div>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon" aria-hidden>
                <FileText style={{ width: 20, height: 20, color: '#374151' }} />
              </div>
              <div className="feature-body">
                <div className="feature-title">Chat with Your Resume</div>
                <div className="feature-desc">Get instant, AI-driven answers about your career history.</div>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon" aria-hidden>
                <Wand2 style={{ width: 20, height: 20, color: '#374151' }} />
              </div>
              <div className="feature-body">
                <div className="feature-title">Resume Analysis</div>
                <div className="feature-desc">Receive actionable feedback to refine and optimize your resume.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="landing-how">
        <div className="landing-container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">Get started in minutes with a simple, guided workflow.</p>

          <div className="how-list">
            <div className="how-card">
              <div className="how-num">1</div>
              <div className="how-thumb" aria-hidden>
                <Upload style={{ width: 20, height: 20, color: '#374151' }} />
              </div>
              <div className="how-body">
                <div className="how-title">Upload Resume</div>
                <div className="how-desc">Add your PDF or DOCX resume to begin.</div>
              </div>
            </div>

            <div className="how-card">
              <div className="how-num">2</div>
              <div className="how-thumb" aria-hidden>
                <MessageSquare style={{ width: 20, height: 20, color: '#374151' }} />
              </div>
              <div className="how-body">
                <div className="how-title">Select a Tool</div>
                <div className="how-desc">Choose Mock Interview, Chat, or Analysis.</div>
              </div>
            </div>

            <div className="how-card">
              <div className="how-num">3</div>
              <div className="how-thumb" aria-hidden>
                <Wand2 style={{ width: 20, height: 20, color: '#374151' }} />
              </div>
              <div className="how-body">
                <div className="how-title">Achieve Your Goals</div>
                <div className="how-desc">Get insights, practice answers, and level up your profile.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <a href="#" onClick={(e)=>e.preventDefault()}>Features</a>
          <a href="#" onClick={(e)=>e.preventDefault()}>Contact</a>
          <a href="#" onClick={(e)=>e.preventDefault()}>Privacy Policy</a>
          <a href="#" onClick={(e)=>e.preventDefault()}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
