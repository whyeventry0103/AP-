import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { gameApi } from '../utils/api';

interface HistoryItem {
  gameId: string;
  date: string;
  total_players: number;
  players: { username: string; color: string; rank: number | null }[];
  finishingOrder?: string[];
  myRank: number | null;
  coinsEarned: number;
}

const RANK_LABELS: Record<number, string> = { 1: '1st Place 🥇', 2: '2nd Place 🥈', 3: '3rd Place 🥉', 4: '4th Place' };
const RANK_COLORS: Record<number, string> = { 1: '#f9a825', 2: '#a89968', 3: '#cd7f32', 4: '#888' };

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameApi.history()
      .then(data => setHistory(data.history))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 32, color: '#fff' }}>Game History</h2>
            <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#f9a825', cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>← Back to Home</button>
          </div>
          <p style={{ color: '#b1b1b1', fontSize: 14 }}>Review all your past matches</p>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#fff', padding: 40 }}>Loading history...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: 40, background: '#f5f0e8', borderRadius: 12 }}>No games played yet. <button onClick={() => navigate('/newgame/lobby')} style={{ background: 'none', border: 'none', color: '#f9a825', cursor: 'pointer', fontWeight: 700 }}>Play now!</button></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {history.map((item) => (
              <div key={item.gameId} style={{ background: 'linear-gradient(135deg,#f5f0e8 0%,#faf7f2 100%)', border: '2px solid #a08060', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                <div style={{ background: '#4e342e', color: '#ffe0b2', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Game #{String(item.gameId).slice(-6).toUpperCase()}</span>
                  <span style={{ fontSize: 12, opacity: .9 }}>{new Date(item.date).toLocaleString()}</span>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0d5c8', fontSize: 14 }}>
                    <span style={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: '.5px' }}>Players:</span>
                    <span style={{ color: '#1a1a1a', fontWeight: 600 }}>{item.players.map(p => `${p.username} (${p.color})`).join(', ')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0d5c8', fontSize: 14 }}>
                    <span style={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: '.5px' }}>Finishing Order:</span>
                    <span style={{ color: '#1a1a1a', fontWeight: 700 }}>
                      {(item.finishingOrder && item.finishingOrder.length > 0 ? item.finishingOrder : item.players
                        .slice()
                        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                        .map(p => p.username)
                      ).join(' → ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0d5c8', fontSize: 14 }}>
                    <span style={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: '.5px' }}>Finish Position:</span>
                    <span style={{ color: item.myRank ? RANK_COLORS[item.myRank] : '#888', fontWeight: 700 }}>
                      {item.myRank ? RANK_LABELS[item.myRank] || `#${item.myRank}` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: 14 }}>
                    <span style={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: 12, letterSpacing: '.5px' }}>Coins Earned:</span>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#2e7d32' }}>+{item.coinsEarned}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
