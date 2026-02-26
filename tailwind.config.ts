import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sora)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' },
      },
    },
  },
  plugins: [],
}

export default config
