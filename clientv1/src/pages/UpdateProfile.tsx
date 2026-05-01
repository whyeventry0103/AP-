import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export default function UpdateProfile() {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [message,  setMessage]  = useState('');
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await apiFetch('/auth/update', {
        method: 'PUT',
        body: JSON.stringify({ username, email }),
      });
      await refreshUser();
      setMessage('Profile updated!');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="center">
      <div className="card">
        <h2>Update Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          {error   && <p className="error-msg">{error}</p>}
          {message && <p className="info-msg">{message}</p>}
          <button className="btn btn-primary" type="submit" style={{ marginTop: 8 }}>Save</button>
        </form>
      </div>
    </div>
  );
}
