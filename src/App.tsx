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

import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { DetailPage } from './pages/DetailPage';
import { PlayerPage } from './pages/PlayerPage';
import { HistoryPage } from './pages/HistoryPage';
import { MyListPage } from './pages/MyListPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Title } from './types';

function AppLayout() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiContextTitle, setAiContextTitle] = useState<Title | null>(null);
  const location = useLocation();

  // Hide Navbar, BottomNav, and Footer in player mode for true cinematic fullscreen
  const isPlayerMode = location.pathname.startsWith('/watch');

  const handleOpenAIWithContext = (title: Title) => {
    setAiContextTitle(title);
    setIsAIOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090A0E] text-[#F4F4F5]">
      {/* Cinematic Logo Intro Animation */}
      <CinematicIntro />

      <OfflineBanner />

      {!isPlayerMode && <Navbar onOpenAI={() => setIsAIOpen(true)} />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
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
      {!isPlayerMode && <BottomNav onOpenAI={() => setIsAIOpen(true)} />}

      {/* Floating Tanya AI Action Button (Desktop & Mobile) */}
      {!isPlayerMode && (
        <button
          onClick={() => setIsAIOpen(true)}
          title="Tanya Zhafx AI"
          aria-label="Buka Tanya Zhafx AI"
          className="fixed bottom-20 md:bottom-8 right-5 sm:right-8 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#181A22] hover:bg-[#232632] text-[#F4F4F5] border border-white/10 hover:border-white/25 text-xs font-medium shadow-xl transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          <span className="hidden sm:inline">Tanya AI</span>
        </button>
      )}

      {/* Tanya Zhafx AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        initialContextTitle={aiContextTitle}
        onClearContext={() => setAiContextTitle(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </ErrorBoundary>
  );
}
