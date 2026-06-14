/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-2': 'var(--color-surface-2)',
          border: 'var(--color-border)',
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          overlay: 'var(--color-overlay)',
          input: 'var(--color-input-bg)',
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          subtle: 'var(--color-brand-subtle)',
          border: 'var(--color-brand-border)',
        },
        accent: {
          DEFAULT: 'var(--color-text-primary)',
          hover: 'var(--color-hover)',
          subtle: 'var(--color-hover)',
          border: 'var(--color-border)',
        },
        status: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: 'var(--layout-max-width)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed)',
        header: 'var(--header-height)',
      },
      borderRadius: {
        card: 'var(--radius-md)',
        'card-lg': 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        toast: 'var(--shadow-toast)',
        premium: 'var(--shadow-card)',
        'premium-hover': 'var(--shadow-card)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        smooth: '180ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scan: {
          '0%': { top: '5%' },
          '50%': { top: '95%' },
          '100%': { top: '5%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'toast-in': 'toast-in 200ms ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
        scan: 'scan 3s infinite linear',
      },
    },
  },
  plugins: [],
};
