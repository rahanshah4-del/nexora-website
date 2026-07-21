import defaultTheme from 'tailwindcss/defaultTheme'

export default {
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
          DEFAULT: '#0ea5e9',
          soft: '#38bdf8',
          deep: '#0b82c5',
          sky: '#7dd3fc',
        },
      },
      boxShadow: {
        soft: '0 28px 80px rgba(15, 23, 42, 0.1)',
      },
      backgroundImage: {
        'sparkle-grid': 'radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 30%), radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.16), transparent 25%)',
      },
      animation: {
        'feature-pulse': 'featurePulse 3s ease-in-out infinite',
      },
      keyframes: {
        featurePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.06)' },
        },
      },
    },
  },
  plugins: [],
}
