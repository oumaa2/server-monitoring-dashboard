/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: '#16181d',
          foreground: '#ffffff',
        },
        primary: {
          DEFAULT: '#3B82F6',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#0f1115',
          foreground: '#9CA3AF',
        },
        border: '#374151',
      },
      borderRadius: {
        xl: '12px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
