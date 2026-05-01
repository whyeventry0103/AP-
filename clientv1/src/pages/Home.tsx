import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Welcome, {user?.username}!</h1>
      <p style={{ color: '#aaa', marginBottom: 28 }}>Coins: {user?.coins}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/lobby">
          <button className="btn btn-primary" style={{ width: 160 }}>Play Game</button>
        </Link>
        <Link to="/leaderboard">
          <button className="btn btn-ghost" style={{ width: 160 }}>Leaderboard</button>
        </Link>
        <Link to="/history">
          <button className="btn btn-ghost" style={{ width: 160 }}>My History</button>
        </Link>
      </div>
    </div>
  );
}
