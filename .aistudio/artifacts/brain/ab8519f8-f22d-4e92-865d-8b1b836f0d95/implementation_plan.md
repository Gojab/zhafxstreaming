# Perbaikan Pemutar Anime HLS: Otomatis Failover Multi-Server & Direct Stream

Memperbaiki pemutaran anime agar langsung berjalan mulus menggunakan pemutar HLS native tanpa terjebak di pesan error, dengan mekanisme otomatis mencoba server-server cadangan (cascading failover) dan resolusi ID judul cerdas dari FrameX API.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Dikonfirmasi Pengguna**:
> - Ketika sumber stream pada server utama kosong atau gagal dimuat, pemutar akan **secara otomatis mencari dan beralih ke server HLS cadangan** tanpa memunculkan layar error langsung ke pengguna.
> - Aliran stream tetap 100% menggunakan **HLS Native Player** (`hls.js` + `<video>`) tanpa sandbox dan tanpa pemutar embed pihak ketiga.

---

### 1. Overview & Core Concept

- **Tujuan**: Memastikan pengguna dapat langsung menonton episode anime favoritnya secara instan tanpa terhambat status "Stream Anime Belum Siap di Server Ini".
- **Akar Masalah**:
  1. Beberapa anime tidak memiliki stream di provider default (`grand_warden`), namun tersedia di provider lain seperti `valkyrie`, `wizard`, `super_pekka`, atau `dragon`.
  2. Saat satu provider gagal, pemutar langsung menampilkan layar error alih-alih mencoba provider berikutnya secara otomatis.
  3. Beberapa judul anime yang berasal dari pencarian global memiliki ID TMDB alih-alih AniList ID, sehingga API anime mengembalikan respon kosong jika tidak dikonversi terlebih dahulu.
- **Solusi**: Menerapkan cascading multi-server resolver otomatis di backend dan frontend, pencocokan ID judul cerdas, serta penanganan error transparan.

---

### 2. User Experience & Visual Design

- **Alur Pemutaran yang Mulus**:
  1. Pengguna membuka tayangan anime dan memilih episode.
  2. Indikator pemutar menampilkan status tenang: *"Menghubungkan ke Server HLS..."*.
  3. Jika server 1 tidak merespons dalam 3–4 detik, sistem otomatis menguji server 2, 3, dan seterusnya dengan indikator transisi: *"Mengalihkan ke Server Alternatif..."*.
  4. Begitu manifest `.m3u8` valid ditemukan, video langsung berputar otomatis (Autoplay) dengan kualitas terbaik (1080p/720p).
  5. UI kendali pemutar tetap bersih, elegan, dengan tema gelap sinematik Zhafx, tanpa elemen sandbox dan tanpa gangguan iklan popup.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Otomatis Cascading Provider di Backend & Frontend**
  - *Pendekatan*: Backend menguji provider prioritas secara paralel/fast-fail (timeout 3.5 detik per server), dan frontend memiliki fallback loop jika backend server lokal memerlukan failover upstream.
  - *Alasan*: Pengguna tidak perlu menekan tombol "Coba Server Lain" berulang kali secara manual.
- **Decision 2: Resolusi AniList ID & Title Fallback**
  - *Pendekatan*: Jika endpoint stream anime menerima ID numerik yang gagal di database FrameX anime, backend otomatis melakukan pencarian judul ke database AniList/Kitsu untuk mendapatkan ID anime yang cocok, lalu meminta stream.
  - *Alasan*: Mengatasi anime yang dibuka dari hasil pencarian global atau rekomendasi.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ZHAFX CLIENT (React 19)                         │
│                                                                        │
│   PlayerPage (HLS Native) ──> api.getAnimeStream({ id, episode, ... }) │
│         │                                                              │
│         └──> On Server Fail: Auto-switch next provider in list         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ HTTP Request
┌────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND (server.ts)                        │
│                                                                        │
│   GET /api/anime/stream?id=...&episode=...                             │
│         │                                                              │
│         ├── Step 1: Fast Parallel Probe across Priority Providers      │
│         │           [grand_warden, valkyrie, super_pekka, wizard, ...] │
│         │                                                              │
│         ├── Step 2: Auto Title/ID Matcher (if primary ID not found)    │
│         │                                                              │
│         └── Step 3: Rewrite M3U8 & Segments via /api/anime/proxy       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ Direct Upstream Fetch
┌────────────────────────────────────────────────────────────────────────┐
│                     FRAMEX ANIME CLOUD APIS                            │
│           (api.framextv.tech / api.framextv.xyz / CDNs)                │
└────────────────────────────────────────────────────────────────────────┘
```

#### Komponen & Berkas yang Akan Diperbarui:
1. `server.ts` & `api/anime/[action].ts`:
   - Menerapkan fast-fail probe dan cascading otomatis untuk semua provider anime aktif.
   - Menambahkan fallback pencarian judul jika ID yang dikirim tidak langsung memiliki stream.
   - Memastikan endpoint `/api/anime/proxy` mengalirkan segmen video dengan header CORS dan chunking yang stabil.
2. `src/pages/PlayerPage.tsx`:
   - Menambahkan logika otomatis rotasi server cadangan jika stream pertama gagal di-load oleh Hls.js.
   - Memperbarui feedback visual saat sistem sedang mencoba server alternatif.
   - Memastikan tidak ada pengalihan ke mode embed iframe untuk anime.
3. `src/services/api.ts`:
   - Meningkatkan ketahanan fungsi `getAnimeStream` dengan timeout adaptif dan multi-provider fallback.
