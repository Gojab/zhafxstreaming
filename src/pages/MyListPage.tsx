import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, Compass } from 'lucide-react';
import { useMyList } from '../hooks/useMyList';
import { MediaCard } from '../components/MediaCard';
import { MediaType, Title } from '../types';

export const MyListPage: React.FC = () => {
  const { myList, clear, remove } = useMyList();
  const [filterType, setFilterType] = useState<'all' | MediaType>('all');

  const filteredItems = myList.filter((item) =>
    filterType === 'all' ? true : item.type === filterType
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-16 space-y-7 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#FFB224]">
            <span>Koleksi Favorit</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-[-0.03em]">
            Daftar Saya
          </h1>
          <p className="text-xs sm:text-sm text-white/55 max-w-xl leading-relaxed">
            Kumpulan film, serial TV, dan anime yang Anda simpan untuk ditonton nanti.
          </p>
        </div>

        {myList.length > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass liquid-specular text-xs font-semibold text-white/80 hover:text-red-400 hover:bg-white/[0.14] transition-all cursor-pointer shrink-0 self-start sm:self-auto ios-spring"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Daftar</span>
          </button>
        )}
      </div>

      {/* Apple iOS 26 Liquid Glass Filter Tabs (Segmented Control) */}
      {myList.length > 0 && (
        <div className="inline-flex p-1 rounded-full liquid-glass liquid-specular shadow-lg">
          {(['all', 'movie', 'tv', 'anime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
                filterType === t
                  ? 'bg-white text-[#06070B] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {t === 'all'
                ? 'Semua'
                : t === 'movie'
                ? 'Film'
                : t === 'tv'
                ? 'Serial TV'
                : 'Anime'}
            </button>
          ))}
        </div>
      )}

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/60 shadow-xl">
            <Bookmark className="w-7 h-7 text-[#FFB224]" />
          </div>
          <h2 className="text-base font-bold text-white">
            {myList.length === 0
              ? 'Daftar Anda Masih Kosong'
              : 'Tidak Ada Tayangan dalam Kategori Ini'}
          </h2>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Klik tombol simpan pada halaman detail atau kartu tayangan untuk menambahkannya ke daftar favorit Anda.
          </p>
          <Link
            to="/explore/movie"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#06070B] font-bold text-xs shadow-lg transition-all cursor-pointer mt-2 ios-spring"
          >
            <Compass className="w-4 h-4" />
            <span>Jelajahi Tayangan Sekarang</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredItems.map((item) => {
            const titleObj: Title = {
              id: item.id,
              type: item.type,
              title: item.title,
              poster: item.poster,
              backdrop: item.backdrop,
              year: item.year,
              rating: item.rating,
              overview: '',
              genres: [],
            };

            return (
              <div key={item.id} className="relative group">
                <MediaCard item={titleObj} />
                <button
                  onClick={() => remove(item.id)}
                  title="Hapus dari daftar"
                  aria-label={`Hapus ${item.title} dari daftar saya`}
                  className="absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full liquid-glass liquid-specular hover:bg-white/20 text-white/80 hover:text-red-400 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg ios-spring"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
