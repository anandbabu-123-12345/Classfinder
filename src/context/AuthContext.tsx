import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types.js';
import { authApi, userApi } from '../services/api.js';
import { useNotification } from './NotificationContext.js';

interface PendingOtpData {
  userId: string;
  email: string;
  purpose: 'registration' | 'forgot_password' | 'login';
  devOtp?: string;
  expiresAt: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  pendingOtp: PendingOtpData | null;
  setPendingOtp: (val: PendingOtpData | null) => void;
  login: (credentials: { email: string; password: string; role?: string }) => Promise<any>;
  loginAsDemo: (role: UserRole) => Promise<void>;
  register: (userData: any) => Promise<any>;
  verifyOtp: (enteredOtp: string) => Promise<boolean>;
  resendOtp: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('university_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingOtp, setPendingOtp] = useState<PendingOtpData | null>(null);
  const { notify } = useNotification();

  // Validate existing session on mount
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      const storedToken = localStorage.getItem('university_auth_token');
      if (!storedToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const res = await userApi.getMe();
        if (mounted && res.success && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem('university_auth_token');
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await userApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, []);

  const login = async (credentials: { email: string; password: string; role?: string }) => {
    try {
      const res = await authApi.login(credentials);
      if (res.requiresOtp) {
        setPendingOtp({
          userId: res.userId,
          email: res.email,
          purpose: 'registration',
          devOtp: res.devOtp,
          expiresAt: res.expiresAt,
        });
        notify('info', 'Please verify your account with the OTP sent to your email.', 'Verification Required');
        return { requiresOtp: true };
      }

      if (res.token && res.user) {
        localStorage.setItem('university_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
        notify('success', `Welcome back, ${res.user.name}!`, 'Signed In');
        return { success: true };
      }
      return res;
    } catch (err: any) {
      notify('error', err.message || 'Login failed', 'Authentication Error');
      throw err;
    }
  };

  const loginAsDemo = async (role: UserRole) => {
    try {
      let email = 'alex.student@university.edu';
      let password = 'Student@12345';
      if (role === 'admin') {
        email = 'admin@university.edu';
        password = 'Admin@12345';
      } else if (role === 'lecturer') {
        email = 'dr.smith@university.edu';
        password = 'Lecturer@12345';
      }

      await login({ email, password, role });
    } catch (err: any) {
      notify('error', err.message, 'Demo Login Failed');
    }
  };

  const register = async (userData: any) => {
    try {
      const res = await authApi.register(userData);
      if (res.success && res.userId) {
        setPendingOtp({
          userId: res.userId,
          email: res.email,
          purpose: 'registration',
          devOtp: res.devOtp,
          expiresAt: res.expiresAt,
        });
        notify('success', 'Account created! Enter the 6-digit OTP code sent to your email.', 'Check Email');
        return res;
      }
    } catch (err: any) {
      notify('error', err.message || 'Registration failed', 'Registration Error');
      throw err;
    }
  };

  const verifyOtp = async (enteredOtp: string): Promise<boolean> => {
    if (!pendingOtp) return false;
    try {
      const res = await authApi.verifyOtp({
        userId: pendingOtp.userId,
        enteredOtp,
        purpose: pendingOtp.purpose,
      });

      if (res.success) {
        if (res.token && res.user) {
          localStorage.setItem('university_auth_token', res.token);
          setToken(res.token);
          setUser(res.user);
        }
        setPendingOtp(null);
        notify('success', 'Account verified and activated successfully!', 'Verified');
        return true;
      }
      return false;
    } catch (err: any) {
      notify('error', err.message || 'Invalid or expired OTP', 'Verification Failed');
      return false;
    }
  };

  const resendOtp = async () => {
    if (!pendingOtp) return;
    try {
      const res = await authApi.sendOtp({
        userId: pendingOtp.userId,
        email: pendingOtp.email,
        purpose: pendingOtp.purpose,
      });
      setPendingOtp((prev) =>
        prev
          ? {
              ...prev,
              devOtp: res.devOtp,
              expiresAt: res.expiresAt,
            }
          : null
      );
      notify('info', `New 6-digit OTP sent to ${pendingOtp.email}`, 'OTP Dispatched');
    } catch (err: any) {
      notify('error', err.message, 'Resend Failed');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('university_auth_token');
      setToken(null);
      setUser(null);
      notify('info', 'You have been signed out.', 'Signed Out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        pendingOtp,
        setPendingOtp,
        login,
        loginAsDemo,
        register,
        verifyOtp,
        resendOtp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
