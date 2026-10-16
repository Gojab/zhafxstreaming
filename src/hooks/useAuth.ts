import { useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { storage } from '../lib/storage';
import { authApi } from '../services/authApi';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Synchronize user from storage and verify with backend
  const refreshUser = useCallback(async () => {
    const cachedUser = storage.getUser();
    setUser(cachedUser);

    const token = storage.getToken();
    if (!token) {
      setUser(null);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const res = await authApi.getMe(token);
      if (res.success && res.user) {
        setUser(res.user);
        storage.saveUser(res.user);
      } else {
        // Token is invalid or expired
        storage.removeToken();
        storage.removeUser();
        setUser(null);
      }
    } catch {
      // In case of transient network failure, keep cachedUser if available
      if (cachedUser) {
        setUser(cachedUser);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleAuthChange = () => {
      const current = storage.getUser();
      setUser(current);
    };

    window.addEventListener('zhafx_auth_change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('zhafx_auth_change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [refreshUser]);

  const loginWithCredentials = async (
    login: string,
    password: string,
    rememberMe = true
  ): Promise<AuthResponse> => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.login(login, password, rememberMe);
      if (res.success && res.token && res.user) {
        storage.saveToken(res.token);
        storage.saveUser(res.user);
        setUser(res.user);
        window.dispatchEvent(new CustomEvent('zhafx_progress_updated'));
      }
      return res;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const registerWithCredentials = async (
    name: string,
    email: string,
    password: string,
    username?: string
  ): Promise<AuthResponse> => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.register(name, email, password, username);
      if (res.success && res.token && res.user) {
        storage.saveToken(res.token);
        storage.saveUser(res.user);
        setUser(res.user);
        window.dispatchEvent(new CustomEvent('zhafx_progress_updated'));
      }
      return res;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginWithGoogle = async (email: string, name?: string): Promise<AuthResponse> => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.googleLogin(email, name);
      if (res.success && res.token && res.user) {
        storage.saveToken(res.token);
        storage.saveUser(res.user);
        setUser(res.user);
        window.dispatchEvent(new CustomEvent('zhafx_progress_updated'));
      }
      return res;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginWithOtpCode = async (email: string, code: string, name?: string): Promise<AuthResponse> => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.verifyCode(email, code, name);
      if (res.success && res.token && res.user) {
        storage.saveToken(res.token);
        storage.saveUser(res.user);
        setUser(res.user);
        window.dispatchEvent(new CustomEvent('zhafx_progress_updated'));
      }
      return res;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (): Promise<void> => {
    const token = storage.getToken();
    storage.removeToken();
    storage.removeUser();
    setUser(null);
    window.dispatchEvent(new CustomEvent('zhafx_progress_updated'));
    if (token) {
      await authApi.logout(token);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    loginWithCredentials,
    registerWithCredentials,
    loginWithGoogle,
    loginWithOtpCode,
    logout,
    refreshUser,
  };
}
