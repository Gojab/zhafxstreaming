import React, { useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { OfflineBanner } from './components/OfflineBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIChatDrawer } from './components/AIChatDrawer';
import { CinematicIntro } from './components/CinematicIntro';
import { LiquidBackground } from './components/LiquidBackground';
import { QuickFeaturesModal } from './components/QuickFeaturesModal';
import { ActiveMediaProvider } from './context/ActiveMediaContext';

import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { DetailPage } from './pages/DetailPage';
import { PlayerPage } from './pages/PlayerPage';
import { HistoryPage } from './pages/HistoryPage';
import { MyListPage } from './pages/MyListPage';
import { OfflinePage } from './pages/OfflinePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Title } from './types';

function AppLayout() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [aiContextTitle, setAiContextTitle] = useState<Title | null>(null);
  const location = useLocation();

  // Hide Navbar, BottomNav, and Footer in player mode for true cinematic fullscreen
  const isPlayerMode = location.pathname.startsWith('/watch');

  const handleOpenAIWithContext = (title: Title) => {
    setAiContextTitle(title);
    setIsAIOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06070B] text-white relative selection:bg-[#FFB224]/30 selection:text-white">
      {/* Apple iOS 26 Dynamic Ambient Blurred Backdrop */}
      <LiquidBackground />

      {/* Cinematic Logo Intro Animation (Amazon Original Glass Panel Style) */}
      <CinematicIntro />

      <OfflineBanner />

      {!isPlayerMode && (
        <Navbar
          onOpenAI={() => setIsAIOpen(true)}
          onOpenFeatures={() => setIsFeaturesOpen(true)}
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
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/my-list" element={<MyListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <LoginPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isPlayerMode && <Footer />}
      {!isPlayerMode && (
        <BottomNav
          onOpenAI={() => setIsAIOpen(true)}
          onOpenFeatures={() => setIsFeaturesOpen(true)}
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
          <Sparkles className="w-3.5 h-3.5 text-[#FFB224]" />
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
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ActiveMediaProvider>
        <HashRouter>
          <AppLayout />
        </HashRouter>
      </ActiveMediaProvider>
    </ErrorBoundary>
  );
}
