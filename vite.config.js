import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    modulePreload: {
      resolveDependencies(filename, deps, { hostType }) {
        if (hostType !== 'html') return deps
        return deps.filter((dep) => !/(^|\/)public-(pricing|services)-/.test(dep))
      },
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    reportCompressedSize: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            if (id.includes('/auth') || id.includes('@firebase/auth')) return 'vendor-firebase-auth'
            if (id.includes('/firestore') || id.includes('@firebase/firestore')) return 'vendor-firebase-firestore'
            if (id.includes('/storage') || id.includes('@firebase/storage')) return 'vendor-firebase-storage'
            if (id.includes('/functions') || id.includes('@firebase/functions')) return 'vendor-firebase-functions'
            if (id.includes('/analytics') || id.includes('@firebase/analytics')) return 'vendor-firebase-analytics'
            return 'vendor-firebase-core'
          }
          if (id.includes('node_modules/react-icons/')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-recharts'
          }
          if (id.includes('node_modules/d3-')) {
            return 'vendor-d3'
          }
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-jspdf'
          }
          if (id.includes('node_modules/html2canvas') || id.includes('node_modules/dompurify')) {
            return 'vendor-document-render'
          }
          if (id.includes('node_modules/@simplewebauthn/')) {
            return 'vendor-passkeys'
          }
          if (id.includes('/src/App.jsx')) {
            return 'public-home'
          }
          if (id.includes('/src/pages/public/SolutionPage.jsx')) {
            return 'public-solutions'
          }
          if (id.includes('/src/pages/public/PricingPage.jsx')) {
            return 'public-pricing'
          }
          if (id.includes('/src/pages/public/BusinessServicesPage.jsx') || id.includes('/src/components/BusinessServicesSection.jsx')) {
            return 'public-services'
          }
          if (id.includes('/src/pages/public/AboutPage.jsx') || id.includes('/src/pages/public/ProjectsPage.jsx') || id.includes('/src/pages/public/PrivacyPolicyPage.jsx') || id.includes('/src/pages/public/TermsPage.jsx')) {
            return 'public-static'
          }
          if (id.includes('/src/pages/public/') || id.includes('/src/components/Header.jsx')) {
            return 'public-shell'
          }
          return undefined
        },
      },
    },
  },
})
