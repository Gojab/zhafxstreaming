import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CinematicIntro } from './components/CinematicIntro';
import { LiquidBackground } from './components/LiquidBackground';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ActiveMediaProvider } from './context/ActiveMediaContext';
import { storage } from './lib/storage';
import { supabase } from './lib/supabase';
import { Title } from './types';

// HomePage is imported directly for instant FCP and LCP
import { HomePage } from './pages/HomePage';

// Code splitting: sub-pages lazy-loaded on demand
const ExplorePage = lazy(() => import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const PlayerPage = lazy(() => import('./pages/PlayerPage').then((m) => ({ default: m.PlayerPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const MyListPage = lazy(() => import('./pages/MyListPage').then((m) => ({ default: m.MyListPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const GoogleCallbackPage = lazy(() => import('./pages/GoogleCallbackPage').then((m) => ({ default: m.GoogleCallbackPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Lazy-load heavier drawers & modals only when triggered by user
const AIChatDrawer = lazy(() => import('./components/AIChatDrawer').then((m) => ({ default: m.AIChatDrawer })));
const QuickFeaturesModal = lazy(() => import('./components/QuickFeaturesModal').then((m) => ({ default: m.QuickFeaturesModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const DonationModal = lazy(() => import('./components/DonationModal').then((m) => ({ default: m.DonationModal })));

// Stub for stripped @vercel/analytics
const Analytics = () => null;

function AppLayout() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [aiContextTitle, setAiContextTitle] = useState<Title | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Automatically migrate legacy hash URLs (e.g. /#/explore) to standard paths
  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      const cleanPath = window.location.hash.slice(1);
      window.history.replaceState(null, '', cleanPath);
      navigate(cleanPath, { replace: true });
    }
  }, [navigate]);

  // Smooth scroll restoration to top when navigating routes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Validate active session on mount & handle OAuth redirect tokens
  useEffect(() => {
    // 1. Check if token is passed via OAuth redirect callback (?token=... or ?auth_token=...)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token') || searchParams.get('auth_token');
      if (urlToken) {
        storage.saveToken(urlToken);
        searchParams.delete('token');
        searchParams.delete('auth_token');
        const cleanQuery = searchParams.toString();
        const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);

        // Fetch user data for this token
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${urlToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.user) {
              storage.saveUser(data.user);
            }
          })
          .catch(() => {});
      }
    } catch {
      // safe fallback
    }

    // 2. Validate and refresh existing session from server in background if token exists
    const activeToken = storage.getToken();
    if (activeToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            storage.saveUser(data.user);
          }
        })
        .catch(() => {
          // Keep existing local user on offline or temporary network hiccups
        });
    }

    // 3. Sync Supabase session if present
    try {
      supabase.auth.getSession().then(({ data: { session } = { data: { session: null } } }) => {
        if (!session?.user) return;
        const authUser = session.user;
        storage.saveToken(session.access_token);
        storage.saveUser({
          id: authUser.id,
          email: authUser.email || '',
          name: String(authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Pengguna'),
          avatar: authUser.user_metadata?.avatar_url,
          joinedAt: new Date(authUser.created_at).getTime(),
        });
      }).catch(() => {});
    } catch {}

    // 4. Listen for auth changes WITHOUT nuking storage on INITIAL_SESSION
    let authSub: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          storage.clearAuth();
          return;
        }

        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          const authUser = session.user;
          storage.saveToken(session.access_token);
          storage.saveUser({
            id: authUser.id,
            email: authUser.email || '',
            name: String(authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Pengguna'),
            avatar: authUser.user_metadata?.avatar_url,
            joinedAt: new Date(authUser.created_at).getTime(),
          });
        }
      });
      authSub = data?.subscription;
    } catch {}

    return () => {
      try {
        authSub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  // Hide Navbar, BottomNav, and Footer in player mode for true cinematic fullscreen
  const isPlayerMode = location.pathname.startsWith('/watch');

  const [hasOpenedAI, setHasOpenedAI] = useState(false);
  const [hasOpenedFeatures, setHasOpenedFeatures] = useState(false);
  const [hasOpenedAuth, setHasOpenedAuth] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [hasOpenedDonation, setHasOpenedDonation] = useState(false);

  // Automatically show the donation pop-up on visit + listen for manual button clicks
  useEffect(() => {
    // Check if seen in current session
    let hasSeenThisSession = false;
    try {
      hasSeenThisSession = Boolean(sessionStorage.getItem('zhafx_saweria_shown'));
    } catch {
      hasSeenThisSession = true;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (!hasSeenThisSession) {
      timer = setTimeout(() => {
        setHasOpenedDonation(true);
        setIsDonationOpen(true);
      }, 1500);
    }

    const handleOpenDonation = () => {
      setHasOpenedDonation(true);
      setIsDonationOpen(true);
    };

    window.addEventListener('open-zhafx-donation', handleOpenDonation);
    return () => {
      window.removeEventListener('open-zhafx-donation', handleOpenDonation);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleCloseDonation = () => {
    setIsDonationOpen(false);
    try {
      sessionStorage.setItem('zhafx_saweria_shown', 'true');
    } catch {}
  };

  const handleOpenAI = () => {
    setHasOpenedAI(true);
    setIsAIOpen(true);
  };

  const handleOpenFeatures = () => {
    setHasOpenedFeatures(true);
    setIsFeaturesOpen(true);
  };

  const handleOpenAuth = () => {
    setHasOpenedAuth(true);
    setIsAuthOpen(true);
  };

  const handleOpenAIWithContext = (title: Title) => {
    setAiContextTitle(title);
    setHasOpenedAI(true);
    setIsAIOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06070B] text-white relative selection:bg-white/20 selection:text-white">
      {/* Apple iOS 26 Dynamic Ambient Blurred Backdrop */}
      <LiquidBackground />

      {/* Global Offline Network Status Alert */}
      <OfflineIndicator />

      {/* Cinematic Logo Intro Animation (Amazon Original Glass Panel Style) */}
      <CinematicIntro />

      {!isPlayerMode && (
        <Navbar
          onOpenAI={handleOpenAI}
          onOpenFeatures={handleOpenFeatures}
          onOpenAuth={handleOpenAuth}
        />
      )}

      <main className="flex-1 relative z-10 flex flex-col">
        <Suspense
          fallback={
            <div className="w-full min-h-[60vh] flex items-center justify-center pt-24 pb-12">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.32,
                ease: [0.16, 1, 0.3, 1], // iOS fluid spring physics curve
              }}
              className="w-full flex-1 flex flex-col will-change-[transform,opacity]"
            >
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/explore/:type" element={<ExplorePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route
                  path="/detail/:type/:id"
                  element={<DetailPage onOpenAIWithContext={handleOpenAIWithContext} />}
                />
                <Route
                  path="/watch/:type/:id"
                  element={<PlayerPage onOpenAIWithContext={handleOpenAIWithContext} />}
                />
                <Route
                  path="/watch/:type/:id/:episode"
                  element={<PlayerPage onOpenAIWithContext={handleOpenAIWithContext} />}
                />
                <Route
                  path="/watch/:type/:id/:season/:episode"
                  element={<PlayerPage onOpenAIWithContext={handleOpenAIWithContext} />}
                />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/my-list" element={<MyListPage />} />
                <Route path="/login" element={<AuthPage initialMode="login" />} />
                <Route path="/register" element={<AuthPage initialMode="register" />} />
                <Route path="/forgot-password" element={<AuthPage initialMode="forgot" />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<DashboardPage />} />
                <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
                <Route path="/auth/callback" element={<GoogleCallbackPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {!isPlayerMode && <Footer />}
      {!isPlayerMode && (
        <BottomNav
          onOpenAI={handleOpenAI}
          onOpenFeatures={handleOpenFeatures}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* Tanya Zhafx AI Chat Drawer - Lazy loaded upon first click */}
      {hasOpenedAI && (
        <Suspense fallback={null}>
          <AIChatDrawer
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            initialContextTitle={aiContextTitle}
            onClearContext={() => setAiContextTitle(null)}
          />
        </Suspense>
      )}

      {/* Pusat Fitur Zhafx Modal - Lazy loaded upon first click */}
      {hasOpenedFeatures && (
        <Suspense fallback={null}>
          <QuickFeaturesModal
            isOpen={isFeaturesOpen}
            onClose={() => setIsFeaturesOpen(false)}
            onOpenAI={handleOpenAI}
            onOpenAuth={handleOpenAuth}
          />
        </Suspense>
      )}

      {/* Google / Gmail & Account Auth Modal - Lazy loaded upon first click */}
      {hasOpenedAuth && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
          />
        </Suspense>
      )}

      {/* Saweria QR Donation Modal - Shows cleanly with solid dark background & on click */}
      {hasOpenedDonation && (
        <Suspense fallback={null}>
          <DonationModal
            isOpen={isDonationOpen}
            onClose={handleCloseDonation}
          />
        </Suspense>
      )}

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ActiveMediaProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </ActiveMediaProvider>
    </ErrorBoundary>
  );
}
