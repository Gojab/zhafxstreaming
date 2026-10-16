import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Square,
  Sparkles,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Film,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, RecommendationPick, Title } from '../types';
import { storage } from '../lib/storage';
import { sendChatMessageStream } from '../services/ai';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialContextTitle?: Title | null;
  onClearContext?: () => void;
}

const SUGGESTIONS = [
  'Rekomendasi film aksi yang seru',
  'Anime mirip Attack on Titan',
  'Serial pendek untuk akhir pekan',
  'Film untuk ditonton bareng keluarga',
];

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  initialContextTitle,
  onClearContext,
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return storage.getChatSession();
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [resolvedTitles, setResolvedTitles] = useState<Map<string, Title | null>>(new Map());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState<{ message: string; lastInput?: string } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  // Sync messages to sessionStorage
  useEffect(() => {
    storage.saveChatSession(messages);
  }, [messages]);

  // Handle scroll detection so auto-scroll doesn't fight the user
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    userScrolledUpRef.current = !isAtBottom;
  };

  const scrollToBottom = () => {
    if (chatScrollRef.current && !userScrolledUpRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Trigger automated context message if initialContextTitle passed
  useEffect(() => {
    if (isOpen && initialContextTitle) {
      const prompt = `Ceritakan sekilas kelebihan dan ulasan tentang "${initialContextTitle.title}" (${initialContextTitle.year || ''}) tanpa spoiler, dan berikan rekomendasi serupa!`;
      handleSendMessage(prompt, initialContextTitle);
      if (onClearContext) onClearContext();
    }
  }, [isOpen, initialContextTitle]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    handleStop();
    setMessages([]);
    storage.clearChatSession();
    setCurrentError(null);
  };

  const handleSendMessage = (textToSend?: string, contextTitle?: Title) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const text = rawText.trim();
    if (!text || isStreaming) return;

    if (textToSend === undefined) {
      setInput('');
    }

    setCurrentError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const aiMessageId = `model-${Date.now()}`;
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const nextMessages = [...messages, userMessage, initialAiMessage];
    setMessages(nextMessages);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    sendChatMessageStream(
      text,
      messages.map((m) => ({ role: m.role, text: m.text })),
      contextTitle || initialContextTitle || undefined,
      {
        onChunk: (fullVisibleText: string, currentPicks?: RecommendationPick[]) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, text: fullVisibleText, picks: currentPicks || m.picks }
                : m
            )
          );
        },
        onDone: (finalVisibleText: string, picks: RecommendationPick[], resolvedMap: Map<string, Title | null>) => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          if (resolvedMap) {
            setResolvedTitles((prev) => new Map([...prev, ...resolvedMap]));
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? {
                    ...m,
                    text: finalVisibleText,
                    picks,
                    isStreaming: false,
                  }
                : m
            )
          );
        },
        onError: (errMessage: string) => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          setCurrentError({ message: errMessage, lastInput: text });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, error: errMessage, isStreaming: false }
                : m
            )
          );
        },
      },
      controller.signal
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md transition-opacity">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Apple iOS 26 Liquid Glass Right Drawer Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tanya Zhafx AI"
        className="relative z-10 w-full sm:w-[480px] md:w-[520px] h-full sm:h-auto max-h-screen liquid-glass-dense liquid-specular sm:rounded-l-[36px] border-l border-white/20 flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-[#FFB224] shadow-sm">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Tanya Zhafx AI</h2>
                <span className="px-2 py-0.5 rounded-full liquid-glass text-[10px] font-semibold text-[#FFB224]">
                  Cerdas
                </span>
              </div>
              <p className="text-[11px] text-white/50">Rekomendasi film, serial TV & anime</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Hapus riwayat obrolan"
                aria-label="Hapus riwayat obrolan"
                className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-white/[0.14] transition-colors cursor-pointer ios-spring"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Tutup panel Tanya AI"
              className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.14] transition-colors cursor-pointer ios-spring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div
          ref={chatScrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center px-4 space-y-4 my-auto py-8">
              <div className="w-14 h-14 rounded-full liquid-glass liquid-specular flex items-center justify-center text-[#FFB224] shadow-xl">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Ada yang ingin kamu tonton hari ini?
                </h3>
                <p className="text-xs text-white/55 max-w-xs leading-relaxed">
                  Tanyakan rekomendasi film berdasarkan mood, cari anime mirip favoritmu, atau minta ringkasan tanpa spoiler.
                </p>
              </div>

              {/* Suggestions chips: Apple iOS Liquid Glass Pills */}
              <div className="w-full space-y-2.5 pt-2">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
                  Coba tanyakan:
                </span>
                <div className="flex flex-col gap-2 text-left">
                  {SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(sug)}
                      className="p-3 rounded-[20px] liquid-glass hover:bg-white/[0.14] text-xs text-white/90 hover:text-white transition-all text-left flex items-center justify-between group cursor-pointer ios-spring shadow-sm"
                    >
                      <span>{sug}</span>
                      <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[85%] px-4 py-3 text-xs sm:text-sm leading-relaxed relative group ${
                    msg.role === 'user'
                      ? 'bg-white text-[#06070B] font-medium rounded-[22px] rounded-br-sm shadow-md'
                      : 'liquid-glass liquid-specular text-white/95 rounded-[22px] rounded-bl-sm border border-white/15 shadow-lg'
                  }`}
                >
                  {/* Message role indicator & copy button */}
                  {msg.role === 'model' && (
                    <div className="flex items-center justify-between mb-1.5 border-b border-white/[0.08] pb-1 text-[11px] text-white/60 font-medium">
                      <span className="flex items-center gap-1.5 text-[#FFB224]">
                        <Sparkles className="w-3 h-3 fill-current" />
                        Zhafx AI
                      </span>
                      {msg.text && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          title="Salin teks"
                          className="text-white/50 hover:text-white transition-colors p-0.5 cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  {msg.role === 'model' ? (
                    <div className="prose prose-invert prose-xs max-w-none text-white/90 leading-relaxed">
                      <ReactMarkdown skipHtml={true}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* Streaming pulse indicator */}
                  {msg.isStreaming && !msg.text && (
                    <div className="flex items-center gap-1.5 py-1 text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                  )}

                  {/* Error state */}
                  {msg.error && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-[16px] bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p>{msg.error}</p>
                        {currentError?.lastInput && (
                          <button
                            onClick={() => handleSendMessage(currentError.lastInput)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold underline hover:no-underline cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Coba lagi
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendation Picks Cards (Full bleed 18px corners) */}
                {msg.picks && msg.picks.length > 0 && (
                  <div className="w-full mt-2.5 space-y-1.5">
                    <span className="text-[11px] font-medium text-white/50 flex items-center gap-1">
                      <Film className="w-3.5 h-3.5 text-[#FFB224]" />
                      Rekomendasi Tayangan di Zhafx:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.picks.map((pick, pIdx) => {
                        const resolved = resolvedTitles.get(pick.title);
                        if (resolved) {
                          return (
                            <button
                              key={pIdx}
                              onClick={() => {
                                onClose();
                                navigate(`/detail/${resolved.type}/${resolved.id}`);
                              }}
                              className="flex items-center gap-2.5 p-2 rounded-[18px] liquid-glass hover:bg-white/[0.14] border border-white/10 text-left transition-all active:scale-[0.98] cursor-pointer ios-spring shadow-sm"
                            >
                              <img
                                src={resolved.poster}
                                alt={resolved.title}
                                className="w-9 h-12 object-cover rounded-[12px] bg-[#0E1017] shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-white line-clamp-1 leading-snug">
                                  {resolved.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-white/50 mt-0.5">
                                  <span>{resolved.year}</span>
                                  <span>•</span>
                                  <span className="text-[#FFB224] capitalize font-medium">{resolved.type}</span>
                                </div>
                              </div>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={pIdx}
                            className="flex items-center gap-2 p-2 rounded-[18px] liquid-glass text-left text-xs text-white/60"
                          >
                            <div className="w-8 h-10 rounded-[10px] bg-white/10 flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-white/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-white line-clamp-1">
                                {pick.title}
                              </span>
                              <span className="text-[10px] text-white/40">Katalog tmdb</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Bar: Apple iOS Floating Glass Dock */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] shrink-0 space-y-2">
          {/* Character counter & stop button */}
          <div className="flex items-center justify-between text-[11px] text-white/50 px-1">
            <span>
              {input.length}/1.000 karakter
            </span>
            {isStreaming && (
              <button
                onClick={handleStop}
                className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:underline cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                Hentikan jawaban
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 h-12 rounded-full liquid-glass flex items-center px-4 border border-white/20 focus-within:border-white/40 focus-within:bg-white/[0.12] transition-all">
              <input
                type="text"
                value={input}
                maxLength={1000}
                disabled={isStreaming}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya rekomendasi, sinopsis, atau info tayangan..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              aria-label="Kirim pesan ke Zhafx AI"
              className="w-12 h-12 rounded-full bg-white hover:bg-white/90 disabled:opacity-40 text-[#06070B] font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-lg ios-spring"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
