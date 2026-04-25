import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { disconnectSocket } from '../utils/socket';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/home" className="navbar-title">🎲 LUDO</Link>
      </div>
      <div className="navbar-right">
        <div className="coin-display">
          <span className="coin-icon">💰</span>
          <span className="coin-amount">{user?.coins ?? 0} Coins</span>
        </div>
        <div className="user-dropdown">
          <button className="dropdown-btn">{user?.username} ▼</button>
          <div className="dropdown-menu">
            <Link to="/update-profile" className="dropdown-item">Update Profile</Link>
            <button className="dropdown-item logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
