import { useState, useEffect } from 'react';
import axios from './axios';

interface User {
  id: number;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    authenticated: false,
    loading: true,
  });

  // 認証状態の確認
  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/user');
      setAuthState({
        user: response.data,
        authenticated: true,
        loading: false,
      });
    } catch (error) {
      setAuthState({
        user: null,
        authenticated: false,
        loading: false,
      });
    }
  };

  // ログイン
  const login = async (user_id: string, password: string) => {
    try {
      // CSRF Cookieを取得（Next.jsのリライト経由）
      await axios.get('/sanctum/csrf-cookie');
      
      const response = await axios.post('/api/login', {
        user_id,
        password,
      });

      if (response.data.authenticated) {
        setAuthState({
          user: response.data.user,
          authenticated: true,
          loading: false,
        });
        return { success: true, user: response.data.user };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'ログインに失敗しました';
      return { success: false, message };
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await axios.post('/api/logout');
      setAuthState({
        user: null,
        authenticated: false,
        loading: false,
      });
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'ログアウトに失敗しました';
      return { success: false, message };
    }
  };

  // 初回認証状態確認
  useEffect(() => {
    checkAuth();
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
};

// 認証が必要なページ用のフック
export const useRequireAuth = (redirectTo = '/login') => {
  const { user, authenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !authenticated) {
      window.location.href = redirectTo;
    }
  }, [loading, authenticated, redirectTo]);

  return { user, authenticated, loading };
}; 