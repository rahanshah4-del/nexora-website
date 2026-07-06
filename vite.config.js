import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
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
            return 'vendor-firebase'
          }
          if (id.includes('node_modules/react-icons/')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') || id.includes('node_modules/dompurify')) {
            return 'vendor-documents'
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
