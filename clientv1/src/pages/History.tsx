import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

interface GameRecord {
  _id: string;
  players: { userId: string; username: string; rank: number; coinsEarned: number }[];
  finishedAt: string;
}

export default function History() {
  const [history, setHistory]  = useState<GameRecord[]>([]);
  const [page, setPage]        = useState(1);
  const [totalPages, setTotal] = useState(1);

  useEffect(() => {
    apiFetch(`/users/history?page=${page}`)
      .then(data => { setHistory(data.history); setTotal(data.pages); })
      .catch(() => {});
  }, [page]);

  return (
    <div className="page">
      <h1>Game History</h1>
      {history.length === 0 && <p className="info-msg">No games yet.</p>}
      {history.map(game => (
        <div key={game._id} style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            {new Date(game.finishedAt).toLocaleString()}
          </p>
          <table>
            <thead>
              <tr><th>Player</th><th>Rank</th><th>Coins Earned</th></tr>
            </thead>
            <tbody>
              {game.players
                .sort((a, b) => a.rank - b.rank)
                .map(p => (
                  <tr key={p.userId}>
                    <td>{p.username}</td>
                    <td>#{p.rank}</td>
                    <td>+{p.coinsEarned}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span style={{ fontSize: 13, color: '#aaa' }}>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}
