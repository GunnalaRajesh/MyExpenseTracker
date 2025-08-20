import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    base: "/MyExpenseTracker/",   // ✅ required for GitHub Pages subpath
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          '/MyExpenseTracker/favicon.ico',
          '/MyExpenseTracker/apple-touch-icon.png'
        ],
        manifest: {
          name: 'Ex-Tra',
          short_name: 'Expenses',
          description: 'Track your expenses quickly.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/MyExpenseTracker/',
          scope: '/MyExpenseTracker/',
          icons: [
            {
              src: '/MyExpenseTracker/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/MyExpenseTracker/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/MyExpenseTracker/pwa-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/MyExpenseTracker/pwa-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ]
  }
})
