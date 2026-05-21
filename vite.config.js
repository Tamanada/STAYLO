import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Multi-entry config:
//   - index.html  → marketing site + hotelier dashboard (staylo.app)
//   - guest.html  → guest-facing app  (app.staylo.app)
//
// Both builds share the same React, Supabase client, i18n bundles,
// design system and hooks. Bundle splitting is automatic per entry
// point — guests don't download the hotelier dashboard code, and
// hoteliers don't download the guest flows.
//
// Vercel routes the host `app.staylo.app` → /guest.html (see vercel.json).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        guest: resolve(__dirname, 'guest.html'),
      },
    },
  },
})
