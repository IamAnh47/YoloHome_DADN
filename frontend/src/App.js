import React, { useState, useEffect, createContext } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useLocation
} from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import DeviceControl from './components/DeviceControl/DeviceControl';
import Alerts from './components/Alerts/Alerts';
import AlertConfig from './components/Alerts/AlertConfig';
import SensorsPage from './components/Sensors/SensorsPage';
import PredictionsPage from './components/Predictions/PredictionsPage';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Footer from './components/common/Footer';
import ToastContainer from './components/UI/ToastContainer';
import alertService from './services/alertService';

// Create authentication context
export const AuthContext = createContext(null);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);
  
  const handleLogin = (token) => {
    localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
  };
  
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, handleLogin, handleLogout }}>
    <Router>
        <AppContent />
      </Router>
      <ToastContainer />
    </AuthContext.Provider>
  );
}

function AppContent() {
  const { isAuthenticated } = React.useContext(AuthContext);
  const location = useLocation();
  
  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }
  
  // If authenticated and trying to access login page, redirect to dashboard
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/dashboard" />;
  }
  
  return (
      <div className="app">
      {isAuthenticated ? (
        <AuthenticatedLayout />
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </div>
  );
}

function LoginPage() {
  const { handleLogin } = React.useContext(AuthContext);
  
  return (
    <div className="login-container-wrapper">
      <Login onLogin={handleLogin} />
    </div>
  );
}

function AuthenticatedLayout() {
  const { handleLogout } = React.useContext(AuthContext);
  
  // Thiết lập cơ chế kiểm tra cảnh báo định kỳ
  useEffect(() => {
    // Kiểm tra cảnh báo ngay khi component được mount
    alertService.checkAndNotifyNewAlerts();
    
    // Thiết lập interval kiểm tra mỗi 60 giây
    const intervalId = setInterval(() => {
      alertService.checkAndNotifyNewAlerts();
    }, 60000);
    
    // Dọn dẹp khi component unmount
    return () => clearInterval(intervalId);
  }, []);
  
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
                      <Route path="/predictions" element={<PredictionsPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Routes>
                  </main>
                </div>
                <Footer />
              </div>
  );
}

export default App;