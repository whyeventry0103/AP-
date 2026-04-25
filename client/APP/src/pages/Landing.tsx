import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="page">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)', padding: '40px 20px' }}>
        <h1 style={{ fontSize: 64, fontWeight: 900, color: '#f9a825', marginBottom: 12, textShadow: '3px 3px 6px rgba(0,0,0,.3)', animation: 'slideDown .6s ease' }}>🎲 LUDO</h1>
        <p style={{ fontSize: 24, color: '#e8f5e9', fontWeight: 600, marginBottom: 40 }}>Classic Board Game Experience</p>
        <div style={{ background: '#f5f0e8', border: '3px solid #4e342e', borderRadius: 12, padding: 40, width: '100%', maxWidth: 500, boxShadow: '0 12px 40px rgba(0,0,0,.2)' }}>
          <h2 style={{ color: '#4e342e', fontSize: 28, marginBottom: 30, textAlign: 'center' }}>Welcome to LUDO</h2>
          <div style={{ marginBottom: 30 }}>
            <p style={{ textAlign: 'center', color: '#4e342e', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>Join the Game</p>
            <Link to="/login" style={{ display: 'block', width: '100%', padding: 14, marginBottom: 12, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'none', borderRadius: 6, border: '2px solid #2c1810', background: '#4e342e', color: '#ffe0b2', textAlign: 'center', transition: 'all .3s ease' }}>
              🔐 Login
            </Link>
            <Link to="/signup" style={{ display: 'block', width: '100%', padding: 14, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'none', borderRadius: 6, border: '2px solid #1b5e20', background: '#2e7d32', color: '#fff', textAlign: 'center', transition: 'all .3s ease' }}>
              ✨ Sign Up
            </Link>
          </div>
          <div style={{ background: '#fff8f0', border: '2px solid #d4c4b0', borderRadius: 8, padding: 20 }}>
            <h3 style={{ color: '#4e342e', fontSize: 16, marginBottom: 12, fontWeight: 700 }}>Quick Rules</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {['Roll the dice to move your tokens', 'Get all 4 tokens from home to the finish', 'First player to finish wins!', 'Capture opponents tokens to send them home'].map((rule, i) => (
                <li key={i} style={{ color: '#666', fontSize: 13, padding: '6px 0 6px 24px', position: 'relative', lineHeight: 1.6 }}>
                  <span style={{ position: 'absolute', left: 0 }}>🎮</span>{rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
