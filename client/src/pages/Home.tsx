import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page">
      <Navbar />
      <div style={{ animation: 'fadeIn .4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, color: '#fff', marginBottom: 8 }}>Welcome, {user?.username}!</h2>
          <p style={{ fontSize: 16, color: '#9c9c9c' }}>Choose an option below to continue</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginBottom: 40 }}>
          {[
            { icon: '🎮', title: 'Play Game', desc: 'Join a lobby and play with other players', to: '/newgame/lobby', label: 'Start Playing' },
            { icon: '🏆', title: 'Leaderboard', desc: 'Check global rankings and player stats', to: '/leaderboard', label: 'View Rankings' },
            { icon: '📊', title: 'Game History', desc: 'Review your past matches and results', to: '/history', label: 'View History' }
          ].map(card => (
            <div key={card.title} style={{ background: 'linear-gradient(135deg,#f5f0e8 0%,#faf7f2 100%)', border: '2px solid #a08060', borderRadius: 12, padding: '30px 24px', textAlign: 'center', transition: 'all .3s ease', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.15)'; (e.currentTarget as HTMLElement).style.borderColor = '#f9a825'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'; (e.currentTarget as HTMLElement).style.borderColor = '#a08060'; }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{card.icon}</div>
              <h3 style={{ fontSize: 20, color: '#4e342e', marginBottom: 12 }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>{card.desc}</p>
              <Link to={card.to} style={{ background: '#4e342e', color: '#ffe0b2', border: '2px solid #2c1810', padding: '10px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', textDecoration: 'none', display: 'inline-block' }}>
                {card.label}
              </Link>
            </div>
          ))}
        </div>
        <div style={{ background: '#f5f0e8', border: '2px solid #a08060', borderRadius: 12, padding: 30 }}>
          <h3 style={{ fontSize: 20, color: '#4e342e', marginBottom: 24 }}>Your Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 20 }}>
            {[
              { label: 'Total Games', value: user?.total_played ?? 0 },
              { label: 'Coin Balance', value: `${user?.coins ?? 0}` }
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', border: '2px solid #d4c4b0', borderRadius: 8, padding: 20, textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, fontWeight: 600 }}>{stat.label}</span>
                <span style={{ display: 'block', fontSize: 28, fontWeight: 900, color: '#f9a825' }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
