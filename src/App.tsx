import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CinematicIntro } from './components/CinematicIntro';
import { LiquidBackground } from './components/LiquidBackground';
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

  // Validate active session on mount & handle OAuth redirect tokens
  useEffect(() => {
    // Check if token is passed via OAuth redirect callback (?token=... or ?auth_token=...)
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
      }
    } catch {
      // safe fallback
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
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
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        storage.removeToken();
        storage.removeUser();
        return;
      }
      const authUser = session.user;
      storage.saveToken(session.access_token);
      storage.saveUser({
        id: authUser.id,
        email: authUser.email || '',
        name: String(authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Pengguna'),
        avatar: authUser.user_metadata?.avatar_url,
        joinedAt: new Date(authUser.created_at).getTime(),
      });
    });

    return () => listener.subscription.unsubscribe();
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
    const hasSeenThisSession = sessionStorage.getItem('zhafx_saweria_shown');
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
    sessionStorage.setItem('zhafx_saweria_shown', 'true');
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

      {/* Cinematic Logo Intro Animation (Amazon Original Glass Panel Style) */}
      <CinematicIntro />

      {!isPlayerMode && (
        <Navbar
          onOpenAI={handleOpenAI}
          onOpenFeatures={handleOpenFeatures}
          onOpenAuth={handleOpenAuth}
        />
      )}

      <main className="flex-1 relative z-10">
        <Suspense
          fallback={
            <div className="w-full min-h-[60vh] flex items-center justify-center pt-24 pb-12">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          }
        >
          <Routes>
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
              path="/watch/:type/:id/:season/:episode"
              element={<PlayerPage onOpenAIWithContext={handleOpenAIWithContext} />}
            />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/my-list" element={<MyListPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<DashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
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
