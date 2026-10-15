import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import { MyListItem } from '../types';

export function useMyList() {
  const [myList, setMyList] = useState<MyListItem[]>([]);

  const refresh = useCallback(() => {
    setMyList(storage.getMyList());
  }, []);

  useEffect(() => {
    refresh();
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const toggle = useCallback(
    (item: Omit<MyListItem, 'addedAt'>) => {
      const isAdded = storage.toggleMyList(item);
      refresh();
      return isAdded;
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      storage.removeMyListItem(id);
      refresh();
    },
    [refresh]
  );

  const isSaved = useCallback(
    (id: string) => {
      return myList.some(item => item.id === id);
    },
    [myList]
  );

  const clear = useCallback(() => {
    storage.clearMyList();
    refresh();
  }, [refresh]);

  return {
    myList,
    toggle,
    remove,
    isSaved,
    clear,
    refresh,
  };
}
