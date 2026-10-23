import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const projectRootDir = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(projectRootDir, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('hls.js')) {
                return 'vendor-hls';
              }
              if (
                id.includes('react-markdown') ||
                id.includes('micromark') ||
                id.includes('remark') ||
                id.includes('unified') ||
                id.includes('unist') ||
                id.includes('vfile')
              ) {
                return 'vendor-markdown';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react-icons') || id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('scheduler')
              ) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      // HMR is disabled in AI Studio per runtime environment constraints.
      hmr: false,
      watch: null,
    },
  };
});
