import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
  } catch (err) {
    console.error('[ZHAFX] Error initializing app:', err);
    // Fallback UI to prevent infinite spinner on Windows if critical failure occurs
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #06070B; color: #ffffff; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
        <h2 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 8px;">Gagal Memuat Aplikasi</h2>
        <p style="font-size: 0.875rem; color: #98A2C3; margin-bottom: 20px; max-width: 400px;">Terjadi kendala saat menginisialisasi browser. Silakan muat ulang halaman.</p>
        <button onclick="window.location.reload()" style="padding: 10px 24px; border-radius: 9999px; background: #FFB224; color: #000000; font-weight: bold; border: none; cursor: pointer; font-size: 0.875rem;">
          Muat Ulang Halaman
        </button>
      </div>
    `;
  }
}
