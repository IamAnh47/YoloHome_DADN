import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  createRoutesFromChildren,
  createBrowserRouter,
  RouterProvider 
} from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import DeviceControl from './components/DeviceControl/DeviceControl';
import Alerts from './components/Alerts/Alerts';
import AlertConfig from './components/Alerts/AlertConfig';
import SensorsPage from './components/Sensors/SensorsPage';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Footer from './components/common/Footer';

// Create router with future flags to remove deprecation warnings
const router = createBrowserRouter(
  createRoutesFromChildren(
    <Route>
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/*" element={<LayoutWrapper />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

// Layout wrapper component
function LayoutWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
  };
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="app-container">
      <Header onLogout={handleLogout} />
      <div className="main-container">
        <Sidebar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/devices" element={<DeviceControl />} />
            <Route path="/sensors" element={<SensorsPage />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/alert-config" element={<AlertConfig />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}

// Login wrapper component
function LoginWrapper({ onLogin }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return <Login onLogin={handleLogin} />;
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;