import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import compression from 'vite-plugin-compression2'

const isDev = process.env.NODE_ENV !== 'production'
const indexBootstrapScriptHash = "'sha256-vcUoBnSA12mp8svfpQU+aInIdToJ7fTSBGn+N2zVe70='"

// Production: no unsafe-eval (Vite/React don't need it at runtime).
// Development: unsafe-eval AND unsafe-inline needed for Vite HMR and React Refresh preamble.
const scriptSrc = isDev
  ? `'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com`
  : `'self' ${indexBootstrapScriptHash} https://js.sentry-cdn.com`

// NOTE: api.qrserver.com and chart.googleapis.com are intentionally NOT included.
// MFA QR codes are now generated client-side (qrcode library — no external calls).
// Class join QR codes use chart.googleapis.com but that is a non-secret URL — if
// that service is re-enabled, add it to img-src. For now both are removed.
const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // 'unsafe-inline' kept: React inline style props (style={{}}) and Tailwind generate inline styles.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // fonts.gstatic.com is only in font-src, NOT duplicated in img-src
  // Phase 6: supabase.co removed from img-src; CDN and local VIL storage added
  "img-src 'self' data: blob: https://cdn.edusync.dev https://*.cloudfront.net https://api.dicebear.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Phase 6: supabase.co removed from connect-src; VIL API and WebSocket added
  "connect-src 'self' http://localhost:8080 ws://localhost:8080 https://cdn.edusync.dev https://sentry.io https://*.vercel.app",
  "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = {
  'Content-Security-Policy': cspDirectives,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

function securityHeadersPlugin() {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        Object.entries(securityHeaders).forEach(([key, value]) => {
          res.setHeader(key, value)
        })
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const isAnalyze = env.ANALYZE === 'true'
  const hasSentryToken = Boolean(env.VITE_SENTRY_AUTH_TOKEN)

  return {
    plugins: [
      compression({
        algorithms: ['gzip', 'brotliCompress'],
        exclude: [/\.(br)$/, /\.(gz)$/],
      }),
      securityHeadersPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'icons/*.svg'],
        manifest: {
          name: 'EduSync LMS',
          short_name: 'EduSync',
          description: 'Platform Belajar Digital untuk Sekolah Indonesia',
          theme_color: '#6366f1',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'id',
          icons: [
            { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
            { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
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
              url: '/app/student/dashboard',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Kursus Saya',
              short_name: 'Kursus',
              url: '/app/student/courses',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            // NEVER cache: All mutating requests
            {
              urlPattern: /.*/i,
              handler: 'NetworkOnly' as const,
              method: 'POST',
            },
            {
              urlPattern: /.*/i,
              handler: 'NetworkOnly' as const,
              method: 'PUT',
            },
            {
              urlPattern: /.*/i,
              handler: 'NetworkOnly' as const,
              method: 'DELETE',
            },
            // VIL API routes — NetworkFirst (Phase 6: replaces Supabase PostgREST entries)
            {
              urlPattern: /^http:\/\/localhost:8080\/api\/v1\//,
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'vil-api',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 },
                networkTimeoutSeconds: 10,
              },
            },
            // VIL Storage — StaleWhileRevalidate
            {
              urlPattern: /^http:\/\/localhost:8080\/api\/v1\/storage\//,
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'vil-storage',
                expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
            // S3/R2/CDN storage — StaleWhileRevalidate
            {
              urlPattern: /^https:\/\/cdn\.edusync\.dev\/.*/,
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'cdn-storage',
                expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
            // Images: CacheFirst with 30 days
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            // Fonts: CacheFirst with 365 days
            {
              urlPattern: /\.(?:woff2?|ttf|eot)$/i,
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        devOptions: { enabled: true },
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
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      sourcemap: hasSentryToken ? true : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // ── Vendor chunks ───────────────────────────────────────────────
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Phase 6: vendor-supabase chunk removed (@supabase/supabase-js decommissioned)
            'vendor-recharts': ['recharts'],
            'vendor-katex': ['katex'],
            'vendor-query': ['@tanstack/react-query', '@tanstack/react-virtual'],
            'vendor-motion': ['motion'],
            'vendor-dnd': ['@hello-pangea/dnd'],
            'vendor-markdown': ['remark-gfm', 'remark-math', 'rehype-katex'],
            'vendor-sentry': ['@sentry/react'],
            'vendor-date': ['date-fns'],
            'vendor-sanitize': ['dompurify'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'valibot'],
            'vendor-ui': ['lucide-react'],
          },
        },
      },
    },
  }
})
