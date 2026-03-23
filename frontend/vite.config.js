import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enable SW in dev mode so beforeinstallprompt fires during local testing
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: '/',               // Required for Chrome's install eligibility check
        name: 'KroEasy – Nowrozabad & Birshingpur Pali Services',
        short_name: 'KroEasy',
        description: 'KroEasy – Nowrozabad aur Birshingpur Pali mein Electrician, Plumber, Beautician, AC Technician, Car Booking. Apne shehar ki har service ek app mein.',
        theme_color: '#F97316',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'KroEasy Home Screen',
          },
        ],
      },
      workbox: {
        // DO NOT use skipWaiting+clientsClaim together — causes forced page reloads mid-session
        // The SW will activate naturally when all tabs are closed/reopened
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude firebase-messaging-sw.js so Workbox doesn't precache or intercept it —
        // it must be served fresh every time to avoid conflicts with FCM background handling.
        globIgnores: ['firebase-messaging-sw.js'],
        // Prevent Workbox navigation fallback from hijacking the Firebase SW route
        navigateFallbackDenylist: [/firebase-messaging-sw\.js/],
        // Cache navigation (HTML) requests so the app loads instantly on repeat visits
        navigationPreload: false,  // use cache instead of preload for offline support
        runtimeCaching: [
          {
            // Cache all same-origin navigation requests (app shell)
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
