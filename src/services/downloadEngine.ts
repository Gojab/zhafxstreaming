export type DownloadStatus =
  | 'resolving'
  | 'downloading'
  | 'assembling'
  | 'completed'
  | 'paused'
  | 'error';

export interface DownloadTask {
  id: string;
  contentId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  poster?: string;
  year?: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  filename: string;
  status: DownloadStatus;
  progress: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  speed: string; // e.g. "3.4 MB/s"
  eta: string; // e.g. "25s"
  segmentsCompleted?: number;
  totalSegments?: number;
  error?: string;
  blobUrl?: string;
  directDownloadUrl?: string;
  createdAt: number;
  completedAt?: number;
}

const STORAGE_KEY = 'zhafx_downloads_history_v1';
const activeControllers = new Map<string, AbortController>();
const blobRegistry = new Map<string, Blob>();

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '0 KB/s';
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

export class DownloadEngine {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Set<(tasks: DownloadTask[]) => void> = new Set();

  constructor() {
    this.loadHistory();
  }

  private loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            // Completed or error items from past sessions
            this.tasks.set(item.id, {
              ...item,
              status: item.status === 'downloading' || item.status === 'resolving' ? 'error' : item.status,
              error: item.status === 'downloading' ? 'Unduhan terputus saat halaman ditutup' : item.error,
            });
          }
        }
      }
    } catch {
      // safe fallback
    }
  }

  private saveHistory() {
    try {
      const serializable = Array.from(this.tasks.values()).map((t) => ({
        ...t,
        blobUrl: undefined, // Object URLs do not persist across reloads
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable.slice(0, 50)));
    } catch {
      // safe fallback
    }
  }

  public subscribe(listener: (tasks: DownloadTask[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllTasks());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = this.getAllTasks();
    this.saveHistory();
    for (const listener of this.listeners) {
      listener(list);
    }
    // Also dispatch window custom event
    try {
      window.dispatchEvent(new CustomEvent('zhafx_download_update', { detail: list }));
    } catch {}
  }

  public getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id);
  }

  public getBlob(id: string): Blob | undefined {
    return blobRegistry.get(id);
  }

  public async startDownload(params: {
    contentId: string;
    mediaType: 'movie' | 'tv' | 'anime';
    title: string;
    poster?: string;
    year?: string;
    season?: number;
    episode?: number;
    episodeName?: string;
    audio?: 'sub' | 'dub';
  }): Promise<string> {
    const sNum = params.season || 1;
    const epNum = params.episode || 1;
    const cleanMediaTitle = params.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Zhafx_Media';

    let defaultFilename = '';
    if (params.mediaType === 'movie') {
      defaultFilename = `${cleanMediaTitle.replace(/\s+/g, '_')}_(1080p).mp4`;
    } else if (params.mediaType === 'tv') {
      defaultFilename = `${cleanMediaTitle.replace(/\s+/g, '_')}_S${String(sNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')}.mp4`;
    } else {
      defaultFilename = `${cleanMediaTitle.replace(/\s+/g, '_')}_Episode_${String(epNum).padStart(2, '0')}.mp4`;
    }

    const taskId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const task: DownloadTask = {
      id: taskId,
      contentId: params.contentId,
      mediaType: params.mediaType,
      title: params.title,
      poster: params.poster,
      year: params.year,
      season: params.season,
      episode: params.episode,
      episodeName: params.episodeName,
      filename: defaultFilename,
      status: 'resolving',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: '0 KB/s',
      eta: 'Menghubungkan...',
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.notify();

    const controller = new AbortController();
    activeControllers.set(taskId, controller);

    this.executeDownload(task, controller.signal, params.audio || 'sub').catch((err) => {
      if (controller.signal.aborted) {
        task.status = 'paused';
        task.speed = '0 KB/s';
      } else {
        task.status = 'error';
        task.error = err?.message || 'Gagal mengunduh tayangan.';
        task.speed = '0 KB/s';
      }
      this.notify();
    });

    return taskId;
  }

  private async executeDownload(task: DownloadTask, signal: AbortSignal, audio: 'sub' | 'dub') {
    // Phase 1: Resolve stream source via server
    const q = new URLSearchParams();
    q.set('id', task.contentId);
    q.set('type', task.mediaType);
    if (task.season) q.set('season', String(task.season));
    if (task.episode) q.set('episode', String(task.episode));
    if (task.title) q.set('title', task.title);
    q.set('audio', audio);

    const resolveRes = await fetch(`/api/download/resolve?${q.toString()}`, { signal });
    if (!resolveRes.ok) {
      throw new Error('Gagal menghubungi server penyedia streaming.');
    }

    const streamData = await resolveRes.json();
    if (!streamData.success || !streamData.sources || streamData.sources.length === 0) {
      throw new Error(streamData.error || 'Sumber video tidak ditemukan untuk diunduh.');
    }

    if (streamData.filename) {
      task.filename = streamData.filename;
    }

    const primarySource = streamData.sources[0];
    const sourceUrl = primarySource.proxiedUrl || primarySource.url;
    const isHls = streamData.mode === 'hls' || sourceUrl.includes('.m3u8');

    task.directDownloadUrl = `/api/download/file?url=${encodeURIComponent(primarySource.directUrl || sourceUrl)}&filename=${encodeURIComponent(task.filename)}`;

    if (isHls) {
      await this.downloadHlsStream(task, sourceUrl, signal);
    } else {
      await this.downloadDirectStream(task, sourceUrl, signal);
    }
  }

  private async downloadHlsStream(task: DownloadTask, playlistUrl: string, signal: AbortSignal) {
    task.status = 'downloading';
    task.eta = 'Menganalisis playlist HLS...';
    this.notify();

    // 1. Fetch Playlist Text
    const plRes = await fetch(playlistUrl, { signal });
    if (!plRes.ok) throw new Error(`Gagal memuat playlist m3u8 (HTTP ${plRes.status})`);
    const plText = await plRes.text();

    let targetPlaylistText = plText;
    let baseUri = playlistUrl;

    // Check if master playlist with variants
    if (plText.includes('#EXT-X-STREAM-INF')) {
      const lines = plText.split('\n');
      let bestVariantUrl = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF') && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.startsWith('#')) {
            bestVariantUrl = nextLine;
          }
        }
      }

      if (bestVariantUrl) {
        const resolvedVariant = new URL(bestVariantUrl, baseUri).href;
        baseUri = resolvedVariant;
        const subPlRes = await fetch(resolvedVariant, { signal });
        if (subPlRes.ok) {
          targetPlaylistText = await subPlRes.text();
        }
      }
    }

    // 2. Extract Segment URLs
    const rawLines = targetPlaylistText.split('\n');
    const segmentUrls: string[] = [];
    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      try {
        const fullSegUrl = new URL(line, baseUri).href;
        segmentUrls.push(fullSegUrl);
      } catch {
        segmentUrls.push(line);
      }
    }

    if (segmentUrls.length === 0) {
      throw new Error('Tidak ada segmen video yang ditemukan di dalam playlist.');
    }

    task.totalSegments = segmentUrls.length;
    task.segmentsCompleted = 0;
    this.notify();

    // 3. Download segments with concurrency of 3
    const segmentBuffers: Uint8Array[] = new Array(segmentUrls.length);
    const concurrency = 3;
    let currentIndex = 0;
    let downloadedCount = 0;
    let totalBytesDownloaded = 0;
    const startTime = Date.now();

    const worker = async () => {
      while (currentIndex < segmentUrls.length) {
        if (signal.aborted) throw new Error('Unduhan dijeda');
        const index = currentIndex++;
        const segUrl = segmentUrls[index];

        try {
          const segRes = await fetch(segUrl, { signal });
          if (!segRes.ok) throw new Error(`HTTP ${segRes.status}`);
          const buffer = await segRes.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          segmentBuffers[index] = bytes;

          downloadedCount++;
          totalBytesDownloaded += bytes.byteLength;

          // Metrics update
          const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
          const bytesPerSec = totalBytesDownloaded / elapsedSec;
          const avgSecPerSeg = elapsedSec / downloadedCount;
          const remainingSegs = segmentUrls.length - downloadedCount;

          task.segmentsCompleted = downloadedCount;
          task.downloadedBytes = totalBytesDownloaded;
          // Approximate total size from average segment size
          task.totalBytes = Math.round((totalBytesDownloaded / downloadedCount) * segmentUrls.length);
          task.progress = Math.min(99, Math.round((downloadedCount / segmentUrls.length) * 100));
          task.speed = formatSpeed(bytesPerSec);
          task.eta = formatEta(remainingSegs * avgSecPerSeg);

          // Notify periodically
          if (downloadedCount % 2 === 0 || downloadedCount === segmentUrls.length) {
            this.notify();
          }
        } catch (err: any) {
          if (signal.aborted) throw err;
          console.warn(`[Downloader] Retrying segment ${index}...`, err?.message);
          // 1 retry attempt
          const segRes = await fetch(segUrl, { signal });
          const buffer = await segRes.arrayBuffer();
          segmentBuffers[index] = new Uint8Array(buffer);
          downloadedCount++;
        }
      }
    };

    // Run parallel workers
    const workers = Array.from({ length: Math.min(concurrency, segmentUrls.length) }, () => worker());
    await Promise.all(workers);

    // 4. Assemble video into Blob
    task.status = 'assembling';
    task.progress = 99;
    task.eta = 'Menyatukan segmen berkas video...';
    this.notify();

    const finalBlob = new Blob(segmentBuffers as BlobPart[], { type: 'video/mp4' });
    blobRegistry.set(task.id, finalBlob);
    const blobUrl = URL.createObjectURL(finalBlob);

    task.blobUrl = blobUrl;
    task.downloadedBytes = finalBlob.size;
    task.totalBytes = finalBlob.size;
    task.status = 'completed';
    task.progress = 100;
    task.speed = 'Selesai';
    task.eta = '0s';
    task.completedAt = Date.now();
    this.notify();

    // 5. Trigger browser download to disk
    this.triggerBrowserSave(blobUrl, task.filename);
  }

  private async downloadDirectStream(task: DownloadTask, streamUrl: string, signal: AbortSignal) {
    task.status = 'downloading';
    task.eta = 'Menghubungkan aliran data...';
    this.notify();

    const response = await fetch(streamUrl, { signal });
    if (!response.ok) throw new Error(`Gagal mengunduh file video (HTTP ${response.status})`);

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    task.totalBytes = total;

    if (!response.body) throw new Error('Aliran berkas video kosong dari server.');

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    const startTime = Date.now();

    while (true) {
      if (signal.aborted) throw new Error('Unduhan dibatalkan');
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        task.downloadedBytes = receivedBytes;

        const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
        const bytesPerSec = receivedBytes / elapsedSec;

        if (total > 0) {
          task.progress = Math.min(99, Math.round((receivedBytes / total) * 100));
          const remainingBytes = total - receivedBytes;
          task.eta = formatEta(remainingBytes / bytesPerSec);
        } else {
          task.progress = 50;
          task.eta = `${formatBytes(receivedBytes)} terunduh`;
        }

        task.speed = formatSpeed(bytesPerSec);
        this.notify();
      }
    }

    task.status = 'assembling';
    this.notify();

    const finalBlob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
    blobRegistry.set(task.id, finalBlob);
    const blobUrl = URL.createObjectURL(finalBlob);

    task.blobUrl = blobUrl;
    task.downloadedBytes = finalBlob.size;
    task.totalBytes = finalBlob.size;
    task.status = 'completed';
    task.progress = 100;
    task.speed = 'Selesai';
    task.eta = '0s';
    task.completedAt = Date.now();
    this.notify();

    this.triggerBrowserSave(blobUrl, task.filename);
  }

  public triggerBrowserSave(blobUrl: string, filename: string) {
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 500);
    } catch (e) {
      console.warn('[Downloader] Failed to trigger auto-save:', e);
    }
  }

  public pauseDownload(id: string) {
    const controller = activeControllers.get(id);
    if (controller) {
      controller.abort();
      activeControllers.delete(id);
    }
    const task = this.tasks.get(id);
    if (task && (task.status === 'downloading' || task.status === 'resolving')) {
      task.status = 'paused';
      task.speed = '0 KB/s';
      this.notify();
    }
  }

  public cancelDownload(id: string) {
    const controller = activeControllers.get(id);
    if (controller) {
      controller.abort();
      activeControllers.delete(id);
    }
    this.tasks.delete(id);
    blobRegistry.delete(id);
    this.notify();
  }

  public removeTask(id: string) {
    this.tasks.delete(id);
    blobRegistry.delete(id);
    this.notify();
  }

  public clearCompleted() {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'error') {
        this.tasks.delete(id);
        blobRegistry.delete(id);
      }
    }
    this.notify();
  }
}

export const downloadEngine = new DownloadEngine();
