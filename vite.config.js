import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    // ── Smaller, faster chunks ──
    minify: 'esbuild',
    assetsInlineLimit: 8192,
    // No resolveDependencies filter: for the HTML entry Vite preloads exactly the chunks
    // the entry imports statically (from its own bundle graph), never lazy import() chunks.
    // Those chunks must all load before the entry can run, so filtering them only added
    // round trips; and a name-based list went stale whenever chunks were renamed.
    modulePreload: {
      polyfill: false,
    },
    cssCodeSplit: true,
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // ── Vite 8 + Rolldown: use native codeSplitting.groups instead of
        //    deprecated manualChunks.  Each module is independently matched
        //    against the groups (by priority), so shared Firebase internals
        //    go into their own vendor chunks instead of being absorbed into
        //    whichever app-level chunk imported them first.
        codeSplitting: {
          groups: [
            // ──────────────────────────────────────────────
            // Vendor splits (highest priority – catch node_modules first)
            // ──────────────────────────────────────────────
            {
              name: 'vendor-firebase-auth',
              test: /[\\/]node_modules[\\/]@firebase[\\/]auth[\\/]/,
              priority: 50,
            },
            {
              name: 'vendor-firebase-firestore',
              test: /[\\/]node_modules[\\/]@firebase[\\/]firestore[\\/]/,
              priority: 50,
            },
            {
              name: 'vendor-firebase-storage',
              test: /[\\/]node_modules[\\/]@firebase[\\/]storage[\\/]/,
              priority: 50,
            },
            {
              name: 'vendor-firebase-analytics',
              test: /[\\/]node_modules[\\/]@firebase[\\/]analytics[\\/]/,
              priority: 50,
            },
            // Remaining Firebase / @firebase modules (app, util, logger,
            // component, functions, installations, webchannel-wrapper, etc.)
            {
              name: 'vendor-firebase-core',
              test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 49,
            },
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              priority: 40,
            },
            {
              name: 'vendor-icons',
              test: /[\\/]node_modules[\\/]react-icons[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-recharts',
              test: /[\\/]node_modules[\\/](recharts|recharts-scale)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-d3',
              test: /[\\/]node_modules[\\/]d3-/,
              priority: 30,
            },
            {
              name: 'vendor-jspdf',
              test: /[\\/]node_modules[\\/]jspdf/,
              priority: 30,
            },
            {
              name: 'vendor-document-render',
              test: /[\\/]node_modules[\\/](html2canvas|dompurify|canvas)/,
              priority: 30,
            },
            {
              name: 'vendor-passkeys',
              test: /[\\/]node_modules[\\/]@simplewebauthn[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-framer',
              test: /[\\/]node_modules[\\/]framer-motion/,
              priority: 30,
            },
            {
              name: 'vendor-utils',
              test: /[\\/]node_modules[\\/](date-fns|clsx|dexie)/,
              priority: 30,
            },
          ],
        },
      },
    },
  },
})
