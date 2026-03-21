import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Supabase client
            'vendor-supabase': ['@supabase/supabase-js'],
            // Charts (only pulled in by analytics routes)
            'vendor-recharts': ['recharts'],
            // Heavy PDF/export tools
            'vendor-pdf': ['jspdf', 'html2canvas'],
            // Math rendering
            'vendor-katex': ['katex'],
            // Query management
            'vendor-query': ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
