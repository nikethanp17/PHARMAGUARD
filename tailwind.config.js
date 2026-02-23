/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./App.tsx"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#0066FF',
          red: '#FF0000',
        },
        dark: '#0F172A',
        card: 'rgba(30, 41, 59, 0.7)',
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
        },
        accent: {
          purple: '#8B5CF6',
          green: '#10B981',
        }
      },
      animation: {
        'dna-flow': 'dna-flow 25s linear infinite',
        'float-slow': 'float 20s ease-in-out infinite',
        'float-slower': 'float 25s ease-in-out infinite reverse',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'dna-flow': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-15px) translateX(10px)' },
          '50%': { transform: 'translateY(5px) translateX(20px)' },
          '75%': { transform: 'translateY(15px) translateX(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
