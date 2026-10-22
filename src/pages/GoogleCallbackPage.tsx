import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoCheckmarkCircleOutline as CheckCircle2, IoAlertCircleOutline as AlertCircle, IoSyncOutline as RotateCw, IoArrowBackOutline as ArrowBack } from 'react-icons/io5';
import { storage } from '../lib/storage';
import { CONFIG } from '../config';
import { supabase } from '../lib/supabase';

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const directToken = searchParams.get('token') || searchParams.get('auth_token');

    // If already has direct token from server redirect
    if (directToken) {
      storage.saveToken(directToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${directToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            storage.saveUser(data.user);
            setUserName(data.user.name || data.user.email);
          }
          setStatus('success');
          window.dispatchEvent(new Event('zhafx_auth_change'));
          if (window.opener) {
            window.opener.postMessage(
              { type: 'GOOGLE_AUTH_SUCCESS', token: directToken, user: data.user },
              '*'
            );
            setTimeout(() => window.close(), 600);
          } else {
            setTimeout(() => navigate('/', { replace: true }), 1200);
          }
        })
        .catch(() => {
          setStatus('success');
          window.dispatchEvent(new Event('zhafx_auth_change'));
          setTimeout(() => navigate('/', { replace: true }), 1000);
        });
      return;
    }

    if (error) {
      setStatus('error');
      setErrorMessage(error === 'access_denied' ? 'Masuk dengan Google dibatalkan.' : `Error Google: ${error}`);
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error }, '*');
      }
      return;
    }

    if (!code) {
      // Check if Supabase session is established from OAuth redirect
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          const authUser = session.user;
          const user = {
            id: authUser.id,
            email: authUser.email || '',
            name: String(authUser.user_metadata?.name || authUser.email?.split('@')[0]),
            avatar: authUser.user_metadata?.avatar_url,
            joinedAt: new Date(authUser.created_at).getTime(),
          };
          storage.saveToken(session.access_token);
          storage.saveUser(user);
          setUserName(user.name);
          setStatus('success');
          window.dispatchEvent(new Event('zhafx_auth_change'));
          if (window.opener) {
            window.opener.postMessage(
              { type: 'GOOGLE_AUTH_SUCCESS', token: session.access_token, user },
              '*'
            );
            setTimeout(() => window.close(), 600);
          } else {
            setTimeout(() => navigate('/', { replace: true }), 1200);
          }
        } else {
          setStatus('error');
          setErrorMessage('Kode otorisasi Google tidak ditemukan dalam tautan balik.');
        }
      }).catch(() => {
        setStatus('error');
        setErrorMessage('Kode otorisasi Google tidak ditemukan dalam tautan balik.');
      });
      return;
    }

    // Exchange authorization code for token via serverless / express backend
    const exchangeCode = async () => {
      try {
        const dynamicRedirectUri = window.location.origin.includes('localhost') || window.location.origin.includes('run.app')
          ? `${window.location.origin}/auth/google/callback`
          : (CONFIG.GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`);

        const res = await fetch('/api/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri: dynamicRedirectUri,
          }),
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok || !data.success || !data.token) {
          throw new Error(data.error || 'Gagal menukarkan kode otorisasi dengan akun Google.');
        }

        storage.saveToken(data.token);
        if (data.user) {
          storage.saveUser(data.user);
          setUserName(data.user.name || data.user.email);
        }
        window.dispatchEvent(new Event('zhafx_auth_change'));
        setStatus('success');

        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'GOOGLE_AUTH_SUCCESS',
              token: data.token,
              user: data.user,
            },
            '*'
          );
          setTimeout(() => window.close(), 700);
        } else {
          setTimeout(() => navigate('/', { replace: true }), 1200);
        }
      } catch (err: any) {
        console.error('[GoogleCallbackPage Error]:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Terjadi gangguan saat memverifikasi akun Google Anda.');
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: err?.message }, '*');
        }
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#06070B] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl liquid-glass-dense border border-white/20 p-8 text-center space-y-5 shadow-2xl">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-white">
              <RotateCw className="w-7 h-7 animate-spin text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Menghubungkan Akun Google</h1>
              <p className="text-xs text-zinc-400 mt-1">Harap tunggu beberapa detik, sistem sedang memverifikasi akun Anda...</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Login Berhasil!</h1>
              <p className="text-xs text-zinc-300 mt-1">
                Selamat datang kembali{userName ? `, ${userName}` : ''}. Mengalihkan ke Zhafx...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Gagal Masuk Google</h1>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold shadow-lg hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <ArrowBack className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
