import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#0A0D14',
          secondary: '#111827',
          tertiary:  '#1A2332',
        },
        accent: {
          teal:   '#5EEAD4',
          violet: '#818CF8',
        },
        score: {
          good:    '#22C55E',
          fair:    '#F59E0B',
          poor:    '#EF4444',
        },
        stage: {
          awake: '#F59E0B',
          light: '#6366F1',
          deep:  '#1E3A5F',
          rem:   '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'teal-violet': 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)',
        'teal-fade':   'linear-gradient(180deg, rgba(94,234,212,0.15) 0%, transparent 100%)',
      },
      animation: {
        'pulse-dot':   'pulse-dot 1.2s ease-in-out infinite',
        'shimmer':     'shimmer 1.4s ease-in-out infinite',
        'fade-up':     'fade-up 0.45s ease-out forwards',
        'fade-in':     'fade-in 0.3s ease-out forwards',
        'heart-pop':   'heart-pop 0.2s ease-out forwards',
        'aurora':      'aurora 8s ease-in-out infinite alternate',
        'slide-up':    'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in':    'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float':       'float 3s ease-in-out infinite',
        'count-up':    'fade-up 0.6s ease-out forwards',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(0.85)' },
          '50%':      { opacity: '1',   transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'heart-pop': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        aurora: {
          '0%':   { opacity: '0.7' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
      screens: {
        xs: '390px',
      },
      borderRadius: {
        '2.5xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'teal': '0 0 20px rgba(94, 234, 212, 0.25)',
        'inner-teal': 'inset 0 1px 0 rgba(94, 234, 212, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
