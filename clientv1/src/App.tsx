import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login        from './pages/Login';
import Signup       from './pages/Signup';
import Home         from './pages/Home';
import Lobby        from './pages/Lobby';
import Leaderboard  from './pages/Leaderboard';
import History      from './pages/History';
import UpdateProfile from './pages/UpdateProfile';
import GamePage     from './game/GamePage';

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav className="nav">
      <Link to="/home">Home</Link>
      <Link to="/lobby">Lobby</Link>
      <Link to="/leaderboard">Leaderboard</Link>
      <Link to="/history">History</Link>
      <div className="spacer" />
      <Link to="/profile">{user.username}</Link>
      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 13 }} onClick={logout}>
        Logout
      </button>
    </nav>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home"   element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/lobby"  element={<RequireAuth><Lobby /></RequireAuth>} />
          <Route path="/game"   element={<RequireAuth><GamePage /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
          <Route path="/history"     element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/profile"     element={<RequireAuth><UpdateProfile /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
