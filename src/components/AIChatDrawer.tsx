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

  const handleSendMessage = async (textToSend?: string, contextOverride?: Title | null) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isStreaming) return;

    setCurrentError(null);
    setInput('');
    userScrolledUpRef.current = false;

    const userMsgId = String(Date.now());
    const modelMsgId = String(Date.now() + 1);

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: prompt,
      timestamp: Date.now(),
    };

    const initialModelMessage: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialModelMessage]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build chat history for context
    const historyPayload = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    await sendChatMessageStream(
      prompt,
      historyPayload,
      contextOverride || undefined,
      {
        onChunk: (cleanText, picks) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? { ...m, text: cleanText, picks: picks || m.picks }
                : m
            )
          );
        },
        onDone: (finalCleanText, picks, resolved) => {
          setIsStreaming(false);
          setResolvedTitles((prev) => new Map([...prev, ...resolved]));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? { ...m, text: finalCleanText, picks, isStreaming: false }
                : m
            )
          );
        },
        onError: (errMessage) => {
          setIsStreaming(false);
          setCurrentError({ message: errMessage, lastInput: prompt });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer content: right sheet on desktop, bottom sheet on mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tanya Zhafx AI"
        className="relative z-10 w-full sm:w-[460px] md:w-[500px] h-full sm:h-auto max-h-screen bg-[#090A0E] border-l border-white/[0.08] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#111319] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Tanya Zhafx AI</h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/10 text-zinc-300 border border-white/15">
                  Cerdas
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Rekomendasi film, serial TV & anime</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Hapus riwayat obrolan"
                aria-label="Hapus riwayat obrolan"
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Tutup panel Tanya AI"
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
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
              <div className="w-12 h-12 rounded-2xl bg-[#111319] border border-white/10 flex items-center justify-center text-zinc-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Ada yang ingin kamu tonton hari ini?
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Tanyakan rekomendasi film berdasarkan mood, cari anime mirip favoritmu, atau minta ringkasan tanpa spoiler.
                </p>
              </div>

              {/* Suggestions chips */}
              <div className="w-full space-y-2 pt-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  Coba tanyakan:
                </span>
                <div className="flex flex-col gap-1.5 text-left">
                  {SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(sug)}
                      className="p-2.5 rounded-xl bg-[#111319] hover:bg-[#181A22] border border-white/[0.08] text-xs text-zinc-300 hover:text-white hover:border-white/20 transition-all text-left flex items-center justify-between group cursor-pointer active:scale-[0.99]"
                    >
                      <span>{sug}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
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
                  className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed relative group ${
                    msg.role === 'user'
                      ? 'bg-zinc-200 text-black font-medium rounded-tr-sm'
                      : 'bg-[#111319] text-zinc-200 border border-white/[0.08] rounded-tl-sm'
                  }`}
                >
                  {/* Message role indicator & copy button */}
                  {msg.role === 'model' && (
                    <div className="flex items-center justify-between mb-1.5 border-b border-white/[0.08] pb-1 text-[11px] text-zinc-400 font-medium">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Sparkles className="w-3 h-3 fill-current" />
                        Zhafx AI
                      </span>
                      {msg.text && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          title="Salin teks"
                          className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-zinc-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  {msg.role === 'model' ? (
                    <div className="prose prose-invert prose-xs max-w-none text-zinc-200 leading-relaxed">
                      <ReactMarkdown skipHtml={true}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* Streaming pulse indicator */}
                  {msg.isStreaming && !msg.text && (
                    <div className="flex items-center gap-1.5 py-1 text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                  )}

                  {/* Error state */}
                  {msg.error && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p>{msg.error}</p>
                        {currentError?.lastInput && (
                          <button
                            onClick={() => handleSendMessage(currentError.lastInput)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold underline hover:no-underline"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Coba lagi
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendation Picks Cards */}
                {msg.picks && msg.picks.length > 0 && (
                  <div className="w-full mt-2.5 space-y-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                      <Film className="w-3.5 h-3.5" />
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
                              className="flex items-center gap-2.5 p-2 rounded-xl bg-[#111319] hover:bg-[#181A22] border border-white/[0.08] hover:border-white/20 text-left transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <img
                                src={resolved.poster}
                                alt={resolved.title}
                                className="w-9 h-12 object-cover rounded-md bg-[#090A0E] shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-white line-clamp-1">
                                  {resolved.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                                  <span>{resolved.year}</span>
                                  <span>•</span>
                                  <span className="text-zinc-300 capitalize">{resolved.type}</span>
                                </div>
                              </div>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={pIdx}
                            className="flex items-center gap-2 p-2 rounded-xl bg-[#111319]/60 border border-white/[0.05] text-left text-xs text-zinc-400"
                          >
                            <div className="w-8 h-10 rounded-md bg-[#181A22] flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-white line-clamp-1">
                                {pick.title}
                              </span>
                              <span className="text-[10px] text-zinc-500">Belum tersedia</span>
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

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#111319] shrink-0 space-y-2">
          {/* Character counter & stop button */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
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
            <input
              type="text"
              value={input}
              maxLength={1000}
              disabled={isStreaming}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya rekomendasi, alur cerita, atau info tayangan..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 disabled:opacity-60 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              aria-label="Kirim pesan ke Zhafx AI"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer min-h-[42px]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
