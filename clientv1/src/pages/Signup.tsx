import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup, user } = useAuth();
  const navigate         = useNavigate();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  if (user) { navigate('/home'); return null; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await signup(username, email, password);
      navigate('/home');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="center">
      <div className="card">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary" type="submit" style={{ marginTop: 8 }}>Sign Up</button>
        </form>
        <p style={{ marginTop: 16, fontSize: 14, color: '#aaa' }}>
          Have an account? <Link to="/login" style={{ color: '#818cf8' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
