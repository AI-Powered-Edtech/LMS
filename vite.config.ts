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
          lang: 'id',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          categories: ['education', 'productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
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
              name: 'Dasbor Siswa',
              short_name: 'Siswa',
              description: 'Buka dasbor siswa untuk melihat kursus dan progres',
              url: '/#/app/student/dashboard',
              icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
            },
            {
              name: 'Dasbor Guru',
              short_name: 'Guru',
              description: 'Buka dasbor guru untuk mengelola kelas dan tugas',
              url: '/#/app/teacher/dashboard',
              icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
            },
            {
              name: 'Dasbor Admin',
              short_name: 'Admin',
              description: 'Buka dasbor admin untuk administrasi sekolah',
              url: '/#/app/admin/dashboard',
              icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
            },
            {
              name: 'Buat Kuis',
              short_name: 'Kuis',
              description: 'Buat kuis baru dengan editor guru',
              url: '/#/app/teacher/creator',
              icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
            },
            {
              name: 'Tugas Saya',
              short_name: 'Tugas',
              description: 'Lihat daftar tugas yang harus dikerjakan',
              url: '/#/app/student/assignments',
              icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          navigateFallback: '/offline.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            // VIL backend API
            {
              urlPattern: /\/api\/v1\//i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'vil-api-cache',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              },
            },
            // Cloudflare R2 object storage
            {
              urlPattern: /^https:\/\/.*\.r2\.cloudflarestorage\.com\/.*/i,
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'r2-storage-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
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
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/rest': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/node_modules/**', '**/.pnpm-store/**', '**/.git/**', '**/edusync-api/**'],
      },
    },
    build: {
      sourcemap: hasSentryToken ? true : false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'vendor-lucide'
              }
              if (id.includes('recharts')) {
                return 'vendor-recharts'
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase'
              }
              if (id.includes('motion')) {
                return 'vendor-motion'
              }
              if (id.includes('katex') || id.includes('remark-') || id.includes('rehype-')) {
                return 'vendor-markdown'
              }
              if (id.includes('@tanstack')) {
                return 'vendor-query'
              }
              if (id.includes('@hello-pangea/dnd')) {
                return 'vendor-dnd'
              }
              if (
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('react/')
              ) {
                return 'vendor-react'
              }
              if (id.includes('@sentry')) {
                return 'vendor-sentry'
              }
            }
          },
        },
      },
    },
  }
})
