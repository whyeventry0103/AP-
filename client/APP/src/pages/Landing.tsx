import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="page">
      <div className="landing-container">
        <h1 className="landing-title">🎲 LUDO</h1>
        <p className="landing-subtitle">Classic Board Game Experience</p>
        
        <div className="landing-card">
          <h2 className="landing-card-title">Welcome to LUDO</h2>
          
          <div className="landing-buttons">
            <p className="landing-cta">Join the Game</p>
            <Link to="/login" className="landing-btn landing-btn-login">
              🔐 Login
            </Link>
            <Link to="/signup" className="landing-btn landing-btn-signup">
              ✨ Sign Up
            </Link>
          </div>
          
          <div className="landing-rules">
            <h3 className="landing-rules-title">Quick Rules</h3>
            <ul className="landing-rules-list">
              {[
                'Roll the dice to move your tokens',
                'Get all 4 tokens from home to the finish',
                'First player to finish wins!',
                'Capture opponents tokens to send them home'
              ].map((rule, i) => (
                <li key={i} className="landing-rule-item">
                  <span className="landing-rule-icon">🎮</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}