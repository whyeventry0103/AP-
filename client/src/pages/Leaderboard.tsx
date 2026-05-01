import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { gameApi } from '../utils/api';

interface LeaderUser { _id: string; username: string; coins: number; total_played: number; }

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<LeaderUser[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      const data = await gameApi.leaderboard(params.toString());
      setUsers(data.users);
      setTotalPages(data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchData(); };

  return (
    <div className="page">
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontSize: 32, color: '#fff', textAlign: 'center' }}>Global Leaderboard</h2>
            <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#f9a825', cursor: 'pointer', fontWeight: 600, fontSize: 18 }}>← Back to Home</button>
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <input type="text" className="form-input" placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400, margin: 0 }} />
            <button type="submit" className="form-button" style={{ width: 'auto', marginTop: 0, padding: '12px 20px' }}>Search</button>
          </form>
        </div>
        <div style={{ background: '#f5f0e8', border: '2px solid #a08060', borderRadius: 12, overflow: 'hidden', marginBottom: 30, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: '#4e342e', color: '#ffe0b2' }}>
                <tr>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', width: 80 }}>Rank</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Username</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', width: 120 }}>Games Played</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', width: 100, paddingRight: 24 }}>Coins</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rank = (page - 1) * 10 + i + 1;
                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid #d4c4b0', background: rank <= 3 ? '#fef8f0' : 'transparent' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 13 }}>
                        {rank <= 3 ? MEDALS[rank - 1] : ''} {rank}{rank > 3 ? (rank === 11 || rank === 12 || rank === 13 ? 'th' : rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th') : ''}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{u.username}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>{u.total_played}</td>
                      <td style={{ padding: '14px 24px 14px 16px', textAlign: 'right', color: '#f9a825', fontWeight: 700, fontSize: 15 }}>{u.coins}</td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#888' }}>No players found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <button className="form-button" style={{ width: 'auto', marginTop: 0, padding: '10px 20px' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Previous</button>
          <span style={{ color: '#4e342e', fontWeight: 600, fontSize: 14 }}>Page {page} of {totalPages}</span>
          <button className="form-button" style={{ width: 'auto', marginTop: 0, padding: '10px 20px' }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      </div>
    </div>
  );
}
