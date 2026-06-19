import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
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
    },
  },
  plugins: [],
}
