import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../utils/api';

export default function UpdateProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [dob, setDob] = useState(user?.dob ? user.dob.substring(0, 10) : '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPassword || confirmNew || currentPassword) {
      if (!currentPassword) return setError('Current password required');
      if (newPassword.length < 6) return setError('New password must be at least 6 characters');
      if (newPassword !== confirmNew) return setError('New passwords do not match');
    }
    setLoading(true);
    try {
      const body: any = { dob };
      if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
      const data = await profileApi.update(body);
      updateUser(data.user);
      setSuccess('Profile updated successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmNew('');
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, color: '#4e342e', marginBottom: 8 }}>Update Profile</h2>
          <p style={{ color: '#888', fontSize: 16 }}>Edit your account information</p>
        </div>
        <div style={{ background: '#f5f0e8', border: '2px solid #a08060', borderRadius: 12, padding: 40, marginBottom: 40, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" value={user?.username || ''} disabled />
              <span className="form-hint">Cannot be changed after account creation</span>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} required />
            </div>
            <div style={{ height: 1, background: '#d4c4b0', margin: '32px 0 24px', textAlign: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '50%', top: -12, transform: 'translateX(-50%)', background: '#f5f0e8', padding: '0 12px', fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Change Password (Optional)</span>
            </div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" placeholder="Enter your current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Enter a new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" placeholder="Re-enter your new password" value={confirmNew} onChange={e => setConfirmNew(e.target.value)} minLength={6} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: 14, background: '#4e342e', color: '#ffe0b2', border: '2px solid #2c1810', borderRadius: 6, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => navigate('/home')} style={{ flex: 1, padding: 14, background: '#999', color: '#fff', border: '2px solid #777', borderRadius: 6, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
        <div style={{ background: '#f5f0e8', border: '2px solid #a08060', borderRadius: 12, padding: 30 }}>
          <h3 style={{ fontSize: 20, color: '#4e342e', marginBottom: 24 }}>Account Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 20 }}>
            {[
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
              { label: 'Total Games', value: user?.total_played ?? 0 },
              { label: 'Coin Balance', value: `${user?.coins ?? 0} Coins` }
            ].map(item => (
              <div key={item.label} style={{ background: '#fff', border: '2px solid #d4c4b0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, fontWeight: 600 }}>{item.label}</span>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#4e342e' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
