'use client';
import { useState, useEffect } from 'react';
import { getStoredUser, getStoredToken, setAuth, clearAuth, type User } from '@/lib/auth';
import api from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    const token = getStoredToken();
    if (stored && token) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.token, data.user);
    setUser(data.user);
    return data.user as User;
  }

  function logout() {
    clearAuth();
    setUser(null);
  }

  return { user, loading, login, logout };
}

