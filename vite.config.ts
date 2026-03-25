import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const isAnalyze = env.ANALYZE === 'true'
  const hasSentryToken = Boolean(env.VITE_SENTRY_AUTH_TOKEN)

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
        manifest: {
          name: 'EduSync LMS',
          short_name: 'EduSync',
          description: 'Sistem Manajemen Pembelajaran untuk sekolah Indonesia',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          categories: ['education'],
          screenshots: [
            {
              src: '/screenshots/desktop-dashboard.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Dashboard guru EduSync',
            },
            {
              src: '/screenshots/mobile-courses.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Daftar kursus di perangkat mobile',
            },
          ],
          shortcuts: [
            {
              name: 'Dashboard',
              short_name: 'Dashboard',
              url: '/#/app/student/dashboard',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Kursus Saya',
              short_name: 'Kursus',
              url: '/#/app/student/courses',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          navigateFallback: '/offline.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'supabase-storage',
                expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /\.(?:woff2?|ttf|eot)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
      ...(isAnalyze
        ? [visualizer({ open: true, filename: 'stats.html', gzipSize: true, brotliSize: true })]
        : []),
      ...(hasSentryToken
        ? [
            sentryVitePlugin({
              org: env.VITE_SENTRY_ORG ?? 'edusync',
              project: env.VITE_SENTRY_PROJECT ?? 'edusync-lms',
              authToken: env.VITE_SENTRY_AUTH_TOKEN,
            }),
          ]
        : []),
    ],
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
      sourcemap: hasSentryToken ? true : false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-recharts': ['recharts'],
            'vendor-katex': ['katex'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-motion': ['motion'],
            'vendor-dnd': ['@hello-pangea/dnd'],
            'vendor-markdown': ['remark-gfm', 'remark-math', 'rehype-katex'],
            'vendor-sentry': ['@sentry/react'],
            'vendor-date': ['date-fns'],
            'vendor-sanitize': ['dompurify'],
            'vendor-form': ['react-hook-form', '@hookform/resolvers', 'valibot'],
          },
        },
      },
    },
  }
})
