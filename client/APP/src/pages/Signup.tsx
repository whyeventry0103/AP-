import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../utils/api';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !dob || !password || !confirm) return setError('All fields are required');
    if (username.trim().length < 2 || username.trim().length > 20) return setError('Username must be 2-20 characters');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const data = await authApi.signup({ username: username.trim(), password, dob });
      login(data.token, data.user);
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">🎲 LUDO</h1>
          <p className="auth-subtitle">Create Your Account</p>
        </div>
        <div className="auth-card">
          <h2>Sign Up</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} required minLength={2} maxLength={20} />
              <span className="form-hint">Must be unique and 2-20 characters</span>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Enter a strong password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <span className="form-hint">Minimum 6 characters</span>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" placeholder="Re-enter your password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="form-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
