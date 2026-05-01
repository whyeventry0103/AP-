import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface LBUser {
  _id: string;
  username: string;
  coins: number;
  wins: number;
  total_played: number;
}

export default function Leaderboard() {
  const { user }              = useAuth();
  const [users, setUsers]     = useState<LBUser[]>([]);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotal] = useState(1);

  useEffect(() => {
    apiFetch(`/users/leaderboard?page=${page}`)
      .then(data => { setUsers(data.users); setTotal(data.pages); })
      .catch(() => {});
  }, [page]);

  return (
    <div className="page">
      <h1>Leaderboard</h1>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Coins</th>
            <th>Wins</th>
            <th>Played</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u._id} style={u._id === user?._id ? { background: '#1e1b4b' } : {}}>
              <td>{(page - 1) * 10 + i + 1}</td>
              <td>{u.username} {u._id === user?._id && '(you)'}</td>
              <td>{u.coins}</td>
              <td>{u.wins}</td>
              <td>{u.total_played}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span style={{ fontSize: 13, color: '#aaa' }}>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}
