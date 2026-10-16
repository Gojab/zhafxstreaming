import React, { createContext, useContext, useState, useCallback } from 'react';

interface ActiveMediaContextType {
  activePoster: string;
  activeTitle?: string;
  setActiveMedia: (poster: string, title?: string) => void;
}

const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80';

const ActiveMediaContext = createContext<ActiveMediaContextType>({
  activePoster: DEFAULT_POSTER,
  setActiveMedia: () => {},
});

export const ActiveMediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePoster, setActivePosterState] = useState<string>(DEFAULT_POSTER);
  const [activeTitle, setActiveTitle] = useState<string | undefined>('Zhafx');

  const setActiveMedia = useCallback((poster: string, title?: string) => {
    if (!poster) return;
    setActivePosterState(poster);
    if (title) setActiveTitle(title);
  }, []);

  return (
    <ActiveMediaContext.Provider value={{ activePoster, activeTitle, setActiveMedia }}>
      {children}
    </ActiveMediaContext.Provider>
  );
};

export const useActiveMedia = () => useContext(ActiveMediaContext);
