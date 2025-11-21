/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/types';
import { authApi } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check if user is authenticated (read from localStorage)
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        // Verify token is still valid by calling the backend
        try {
          const response = await authApi.me();

          // Successfully verified - update state with fresh user data
          if (response.success && response.data) {
            setToken(storedToken);
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          } else {
            // Invalid response format, clear auth
            console.error('Invalid auth response format:', response);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        } catch {
          // Token is invalid or expired, clear storage
          console.log('Token validation failed, logging out');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } else {
        // No stored credentials
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await authApi.register(username, email, password);

      // Store token and user
      localStorage.setItem('authToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setToken(response.data.accessToken);
      setUser(response.data.user);

      showSuccess('Registration successful! Welcome to CourseCraft.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      // Store token and user
      localStorage.setItem('authToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setToken(response.data.accessToken);
      setUser(response.data.user);

      showSuccess('Login successful! Welcome back.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear localStorage (no API call needed for NestJS)
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      setToken(null);
      setUser(null);

      showSuccess('Logged out successfully');
    } catch (error) {
      showError('Logout failed. Please try again.');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
