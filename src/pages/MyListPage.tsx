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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-6 min-h-[70vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2A3152]/70 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFB224] mb-1">
            <Bookmark className="w-4 h-4 fill-current" />
            <span>Koleksi Favorit</span>
          </div>
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-2xl sm:text-3xl font-bold text-[#F2F4FB] tracking-tight"
          >
            Daftar Saya
          </h1>
          <p className="text-xs sm:text-sm text-[#98A2C3] mt-1">
            Kumpulan film, serial, dan anime yang Anda simpan untuk ditonton nanti.
          </p>
        </div>

        {myList.length > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#12162A] hover:bg-[#FF5C6C]/10 border border-[#2A3152] hover:border-[#FF5C6C]/50 text-xs font-medium text-[#98A2C3] hover:text-[#FF5C6C] transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Kosongkan daftar
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {myList.length > 0 && (
        <div className="inline-flex p-1 rounded-xl bg-[#12162A] border border-[#2A3152]">
          {(['all', 'movie', 'tv', 'anime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-[#FFB224] text-[#0A0C14] font-semibold shadow'
                  : 'text-[#98A2C3] hover:text-[#F2F4FB]'
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
          <div className="w-14 h-14 rounded-2xl bg-[#12162A] border border-[#2A3152] flex items-center justify-center text-[#98A2C3]">
            <Bookmark className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-[#F2F4FB]">
            {myList.length === 0
              ? 'Daftar Anda Masih Kosong'
              : 'Tidak Ada Tayangan dalam Kategori Ini'}
          </h2>
          <p className="text-xs text-[#98A2C3] max-w-sm leading-relaxed">
            Klik tombol "Tambah ke daftar" pada halaman detail tayangan untuk menyimpannya di sini.
          </p>
          <Link
            to="/explore/movie"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFB224] text-[#0A0C14] font-semibold text-xs transition-all shadow cursor-pointer mt-2"
          >
            <Compass className="w-4 h-4" />
            Jelajahi tayangan sekarang
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
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-[#0A0C14]/90 hover:bg-[#FF5C6C] text-[#98A2C3] hover:text-white border border-[#2A3152] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg backdrop-blur"
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
