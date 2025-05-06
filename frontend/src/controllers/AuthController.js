import authService from '../services/authService';
import UserModel from '../models/UserModel';

class AuthController {
  static async login(username, password) {
    try {
      // Call authentication service
      const response = await authService.login(username, password);
      
      if (response.success) {
        // Store user information and token
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('authToken', response.token);
        
        // Create user model instance and store in localStorage
        const user = new UserModel(response.user);
        localStorage.setItem('userData', JSON.stringify(user));
        
        return {
          success: true,
          token: response.token,
          userId: response.user.id
        };
      } else {
        return {
          success: false,
          message: response.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('AuthController login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  }
  
  static async logout() {
    try {
      await authService.logout();
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userData');
      
      return { success: true };
    } catch (error) {
      console.error('AuthController logout error:', error);
      return {
        success: false,
        message: 'An error occurred during logout'
      };
    }
  }
  
  static isAuthenticated() {
    return localStorage.getItem('authToken') !== null;
  }
  
  static getCurrentUserId() {
    return localStorage.getItem('userId');
  }
  
  static getCurrentUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }
}

export default AuthController;