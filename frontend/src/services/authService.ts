import axios from 'axios';
import { User, LoginResponse } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const authService = {
  // Get current user
  getCurrentUser: async (token: string): Promise<User> => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Email login
  emailLogin: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    return response.data;
  },

  // Email register
  emailRegister: async (email: string, password: string, name?: string): Promise<LoginResponse> => {
    const response = await axios.post(`${API_URL}/auth/register`, { email, password, name });
    return response.data;
  },

  // Initiate Google OAuth
  googleLogin: () => {
    window.location.href = `${API_URL}/auth/google`;
  },

  // Initiate GitHub OAuth
  githubLogin: () => {
    window.location.href = `${API_URL}/auth/github`;
  },

  // Handle OAuth callback
  handleCallback: async (token: string): Promise<LoginResponse> => {
    const user = await authService.getCurrentUser(token);
    return { user, token };
  },

  // Logout
  logout: async () => {
    await axios.post(`${API_URL}/auth/logout`);
  },
};
