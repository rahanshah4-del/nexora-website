import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), cloudflare()],
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
        // ES2015+ output for smaller bundles (no transpilation bloat for modern browsers)
        generatedCode: 'es2015',
        compact: true,
        manualChunks(id) {
          // ── Vendor splits ──
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            if (id.includes('/auth') || id.includes('@firebase/auth')) return 'vendor-firebase-auth'
            if (id.includes('/firestore') || id.includes('@firebase/firestore')) return 'vendor-firebase-firestore'
            if (id.includes('/storage') || id.includes('@firebase/storage')) return 'vendor-firebase-storage'
            if (id.includes('/analytics') || id.includes('@firebase/analytics')) return 'vendor-firebase-analytics'
            return 'vendor-firebase-core'
          }
          if (id.includes('node_modules/react-icons/')) return 'vendor-icons'
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/recharts-scale/')) return 'vendor-recharts'
          if (id.includes('node_modules/d3-')) return 'vendor-d3'
          if (id.includes('node_modules/jspdf')) return 'vendor-jspdf'
          if (id.includes('node_modules/html2canvas') || id.includes('node_modules/dompurify') || id.includes('node_modules/canvas')) return 'vendor-document-render'
          if (id.includes('node_modules/@simplewebauthn/')) return 'vendor-passkeys'
          if (id.includes('node_modules/framer-motion')) return 'vendor-framer'
          // Small shared vendor libs
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/clsx') || id.includes('node_modules/dexie')) return 'vendor-utils'

          // ── Public website splits (each lazy route gets its own chunk) ──
          if (id.includes('/src/App.jsx')) return 'public-app-shell'
          if (id.includes('/src/sections/AISections.jsx')) return 'public-ai-sections'
          if (id.includes('/src/components/PublicTestimonials.jsx')) return 'public-testimonials'
          if (id.includes('/src/components/CopyEmailButton.jsx') || id.includes('/src/components/LazySection.jsx')) return 'public-home-utils'
          // Split HomepageSections into smaller chunks for mobile
          if (id.includes('/src/sections/HomepageSections.jsx')) return 'public-home-content'
          if (id.includes('/src/sections/')) return 'public-home-other'
          // Split business services
          if (id.includes('/src/components/BusinessServicesSection.jsx')) return 'public-business-services'
          if (id.includes('/src/pages/public/SolutionPage.jsx')) return 'public-solutions'
          if (id.includes('/src/pages/public/PricingPage.jsx')) return 'public-pricing'
          if (id.includes('/src/pages/public/BusinessServicesPage.jsx') || id.includes('/src/components/BusinessServicesSection.jsx')) return 'public-services'
          if (id.includes('/src/pages/public/AboutPage.jsx') || id.includes('/src/pages/public/ContactPage.jsx') || id.includes('/src/pages/public/ProjectsPage.jsx') || id.includes('/src/pages/public/PrivacyPolicyPage.jsx') || id.includes('/src/pages/public/TermsPage.jsx') || id.includes('/src/pages/public/RefundPolicyPage.jsx') || id.includes('/src/pages/public/FaqPage.jsx') || id.includes('/src/pages/public/HtmlSitemapPage.jsx')) return 'public-static'
          if (id.includes('/src/pages/public/') || id.includes('/src/components/Header.jsx') || id.includes('/src/components/DefaultSeo.jsx')) return 'public-shell'

          return undefined
        },
      },
    },
  },
})