import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIChatDrawer } from './components/AIChatDrawer';
import { CinematicIntro } from './components/CinematicIntro';
import { LiquidBackground } from './components/LiquidBackground';
import { QuickFeaturesModal } from './components/QuickFeaturesModal';
import { AuthModal } from './components/AuthModal';
import { ActiveMediaProvider } from './context/ActiveMediaContext';
import { storage } from './lib/storage';

// Stub for stripped @vercel/analytics
const Analytics = () => null;

import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { DetailPage } from './pages/DetailPage';
import { PlayerPage } from './pages/PlayerPage';
import { HistoryPage } from './pages/HistoryPage';
import { MyListPage } from './pages/MyListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Title } from './types';

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

    const token = storage.getToken();
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success && data.user) {
            storage.saveUser(data.user);
          } else if (data && data.success === false) {
            storage.removeToken();
            storage.removeUser();
          }
        })
        .catch(() => {
          // Keep offline session
        });
    }
  }, []);

  // Hide Navbar, BottomNav, and Footer in player mode for true cinematic fullscreen
  const isPlayerMode = location.pathname.startsWith('/watch');

  const handleOpenAIWithContext = (title: Title) => {
    setAiContextTitle(title);
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
          onOpenAI={() => setIsAIOpen(true)}
          onOpenFeatures={() => setIsFeaturesOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

      <main className="flex-1 relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/:type" element={<ExplorePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route
            path="/detail/:type/:id"
            element={<DetailPage onOpenAIWithContext={handleOpenAIWithContext} />}
          />
          <Route path="/watch/:type/:id" element={<PlayerPage />} />
          <Route path="/watch/:type/:id/:season/:episode" element={<PlayerPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/my-list" element={<MyListPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isPlayerMode && <Footer />}
      {!isPlayerMode && (
        <BottomNav
          onOpenAI={() => setIsAIOpen(true)}
          onOpenFeatures={() => setIsFeaturesOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

      {/* Floating Apple Liquid Glass Tanya AI Pill (Desktop) */}
      {!isPlayerMode && (
        <button
          onClick={() => setIsAIOpen(true)}
          title="Tanya Zhafx AI"
          aria-label="Buka Tanya Zhafx AI"
          className="hidden md:flex fixed bottom-8 right-8 z-30 items-center gap-2 px-4 py-2.5 rounded-full liquid-glass liquid-specular text-white text-xs font-semibold shadow-2xl ios-spring cursor-pointer hover:bg-white/[0.14]"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>Tanya AI</span>
        </button>
      )}

      {/* Tanya Zhafx AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        initialContextTitle={aiContextTitle}
        onClearContext={() => setAiContextTitle(null)}
      />

      {/* Pusat Fitur Zhafx Modal (Titik 3 Logo X) */}
      <QuickFeaturesModal
        isOpen={isFeaturesOpen}
        onClose={() => setIsFeaturesOpen(false)}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Google / Gmail & Account Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

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
