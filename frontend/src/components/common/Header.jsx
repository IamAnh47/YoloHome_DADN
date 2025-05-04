import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../App';
import './Header.css';

const Header = () => {
  const { handleLogout } = useContext(AuthContext);
  
  const formatDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };
  
  return (
    <header className="header">
      <div className="header-left">
        <Link to="/dashboard" className="logo">
          <i className="fas fa-home"></i>
          <span>YoloHome</span>
        </Link>
        <div className="date">{formatDate()}</div>
      </div>
      
      <div className="header-right">
      <div className="header-actions">
          <button className="icon-button" title="Settings">
            <i className="fas fa-cog"></i>
          </button>
          <button className="icon-button" title="Notifications">
            <i className="fas fa-bell"></i>
          </button>
          <button 
            className="icon-button logout-button" 
            title="Logout"
            onClick={handleLogout}
          >
          <i className="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
        </div>
      </div>
    </header>
  );
};

export default Header;