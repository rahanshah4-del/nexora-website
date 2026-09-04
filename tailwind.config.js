import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  // Was defaulting to Tailwind's 'media' strategy (no darkMode key set), so
  // every `dark:` utility across the app fired off the device's OS-level
  // prefers-color-scheme — regardless of ThemeContext, which forces the app
  // to light mode (removes the `.dark` class, hardcodes theme: 'light')
  // because dark-mode coverage isn't complete/consistent across every page
  // yet. The result on a phone with system dark mode on: components with a
  // `dark:` class went dark, plain pages without one (e.g. the Upgrade
  // Business page) stayed light, and a couple of pages get force-darkened
  // and inverted by the browser's own auto-dark-theme heuristic on top of
  // that — different "night mode" colors on different screens ("sab modules
  // mein night mode colour grading sahi nahi"). Switching to 'class' makes
  // `dark:` utilities respond only to that `.dark` class, so with
  // ThemeContext keeping it off, the whole app now renders consistently in
  // light mode until a real theme toggle ships.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
        '3xl': '1680px',
      },
    },
    extend: {
      screens: {
        xs: '480px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Sora', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          DEFAULT: '#0071e3',
          soft: '#2997ff',
          deep: '#005ab8',
          sky: '#81b9ff',
          light: '#e8f4fd',
        },
        accent: {
          rose: '#ff375f',
          amber: '#ff9f0a',
          emerald: '#30d158',
          violet: '#af52de',
          teal: '#40c8e0',
        },
      },
      boxShadow: {
        soft: '0 8px 40px rgba(0, 0, 0, 0.06)',
        card: '0 2px 12px rgba(0, 0, 0, 0.04)',
        lift: '0 12px 40px rgba(0, 0, 0, 0.10)',
      },
      backgroundImage: {
        'sparkle-grid': 'radial-gradient(circle at top left, rgba(41, 151, 255, 0.15), transparent 30%), radial-gradient(circle at 80% 20%, rgba(175, 82, 222, 0.12), transparent 25%)',
        'hero-gradient': 'linear-gradient(180deg, #ffffff 0%, #f5f5f7 60%, #f0f0f2 100%)',
        'card-glow': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 100%)',
      },
      animation: {
        'feature-pulse': 'featurePulse 3s ease-in-out infinite',
        'ai-pop': 'aiPop 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        featurePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.06)' },
        },
        aiPop: {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
