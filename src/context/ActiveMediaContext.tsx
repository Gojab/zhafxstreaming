import React, { createContext, useContext, useState, useCallback } from 'react';

interface ActiveMediaContextType {
  activePoster: string;
  activeTitle?: string;
  setActiveMedia: (poster: string, title?: string) => void;
}

const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=60';

const ActiveMediaContext = createContext<ActiveMediaContextType>({
  activePoster: DEFAULT_POSTER,
  setActiveMedia: () => {},
});

export const ActiveMediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePoster, setActivePosterState] = useState<string>(DEFAULT_POSTER);
  const [activeTitle, setActiveTitle] = useState<string | undefined>('Zhafx');
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveMedia = useCallback((poster: string, title?: string) => {
    if (!poster) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce background poster update by 160ms so fast scrubbing across cards doesn't trigger rapid re-renders
    debounceTimerRef.current = setTimeout(() => {
      setActivePosterState((prev) => (prev === poster ? prev : poster));
      if (title) {
        setActiveTitle((prev) => (prev === title ? prev : title));
      }
    }, 160);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <ActiveMediaContext.Provider value={{ activePoster, activeTitle, setActiveMedia }}>
      {children}
    </ActiveMediaContext.Provider>
  );
};

export const useActiveMedia = () => useContext(ActiveMediaContext);
