import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    // ── Smaller, faster chunks ──
    minify: 'esbuild',
    assetsInlineLimit: 8192,
    modulePreload: {
      polyfill: false,
      resolveDependencies(filename, deps, { hostType }) {
        if (hostType !== 'html') return deps
        // Only preload the absolute minimum needed for LCP:
        // runtime + entry + react vendor + app shell CSS
        const isCritical = (dep) =>
          /(^|\/)rolldown-runtime/.test(dep) ||
          /(^|\/)index-/.test(dep) ||
          /(^|\/)vendor-react-/.test(dep) ||
          /(^|\/)public-app-shell-/.test(dep)
        return deps.filter((dep) => isCritical(dep))
      },
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

            // ──────────────────────────────────────────────
            // Public website splits – each lazy route / key
            // section gets its own chunk.  Test functions are
            // scoped to src/ so they never capture node_modules.
            // ──────────────────────────────────────────────
            {
              name: 'public-app-shell',
              test(id) {
                return id.includes('/src/App.jsx')
              },
              priority: 20,
            },
            {
              name: 'public-ai-sections',
              test(id) {
                return id.includes('/src/sections/AISections.jsx')
              },
              priority: 20,
            },
            {
              name: 'public-testimonials',
              test(id) {
                return id.includes('/src/components/PublicTestimonials.jsx')
              },
              priority: 20,
            },
            {
              name: 'public-home-utils',
              test(id) {
                return id.includes('/src/components/CopyEmailButton.jsx') ||
                       id.includes('/src/components/LazySection.jsx')
              },
              priority: 20,
            },
            {
              name: 'public-home-content',
              test(id) {
                return id.includes('/src/sections/HomepageSections.jsx')
              },
              priority: 20,
            },
            // Catch-all for remaining src/sections/ files
            {
              name: 'public-home-other',
              test(id) {
                return id.includes('/src/sections/')
              },
              priority: 19,
            },
            {
              name: 'public-business-services',
              test(id) {
                return id.includes('/src/components/BusinessServicesSection.jsx')
              },
              priority: 20,
            },
            {
              name: 'public-solutions',
              test(id) {
                return id.includes('/src/pages/public/SolutionPage.jsx')
              },
              priority: 20,
            },
            {
              name: 'public-pricing',
              test(id) {
                return id.includes('/src/pages/public/PricingPage.jsx')
              },
              priority: 20,
            },
            // Secondary rule for BusinessServicesPage + BusinessServicesSection
            // (lower priority than public-business-services so the latter wins
            //  for the shared component)
            {
              name: 'public-services',
              test(id) {
                return id.includes('/src/pages/public/BusinessServicesPage.jsx') ||
                       id.includes('/src/components/BusinessServicesSection.jsx')
              },
              priority: 19,
            },
            {
              name: 'public-static',
              test(id) {
                return id.includes('/src/pages/public/AboutPage.jsx') ||
                       id.includes('/src/pages/public/ContactPage.jsx') ||
                       id.includes('/src/pages/public/ProjectsPage.jsx') ||
                       id.includes('/src/pages/public/PrivacyPolicyPage.jsx') ||
                       id.includes('/src/pages/public/TermsPage.jsx') ||
                       id.includes('/src/pages/public/RefundPolicyPage.jsx') ||
                       id.includes('/src/pages/public/FaqPage.jsx') ||
                       id.includes('/src/pages/public/HtmlSitemapPage.jsx')
              },
              priority: 20,
            },
            // Catch-all for remaining src/pages/public/ files + shared shell
            {
              name: 'public-shell',
              test(id) {
                return id.includes('/src/pages/public/') ||
                       id.includes('/src/components/Header.jsx') ||
                       id.includes('/src/components/DefaultSeo.jsx')
              },
              priority: 18,
            },
          ],
        },
      },
    },
  },
})
