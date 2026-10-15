import { User, AuthResponse } from '../types';

export const authApi = {
  async register(
    name: string,
    email: string,
    password: string,
    username?: string
  ): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name, email, password, username }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Gagal mendaftarkan akun. Silakan periksa kembali formulir Anda.',
        };
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        message: data.message,
      };
    } catch (err: any) {
      console.error('[authApi.register] Network/Server Error:', err);
      return {
        success: false,
        error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau coba beberapa saat lagi.',
      };
    }
  },

  async login(
    login: string,
    password: string,
    rememberMe = true
  ): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ login, password, rememberMe }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Email atau kata sandi tidak cocok. Silakan coba lagi.',
        };
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        message: data.message,
      };
    } catch (err: any) {
      console.error('[authApi.login] Network/Server Error:', err);
      return {
        success: false,
        error: 'Tidak dapat terhubung ke server autentikasi. Pastikan koneksi Anda aktif.',
      };
    }
  },

  async getMe(token: string): Promise<AuthResponse> {
    if (!token) {
      return { success: false, error: 'Token tidak tersedia.' };
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Sesi telah kedaluwarsa.',
        };
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (err: any) {
      console.error('[authApi.getMe] Network/Server Error:', err);
      return {
        success: false,
        error: 'Gagal memverifikasi sesi dengan server.',
      };
    }
  },

  async logout(token?: string | null): Promise<void> {
    if (!token) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn('[authApi.logout] Silent error during logout:', err);
    }
  },
};
