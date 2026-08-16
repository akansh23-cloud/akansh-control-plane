import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './data/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#08090c',
        graphite: '#0e1014',
        smoke: '#16191f',
        line: '#23262e',
        mist: '#8a8f9a',
        chalk: '#e8eaee',
        ion: '#6c7bff',
        pulse: '#5fd4ff',
        warn: '#f2b45c',
        fail: '#ff6b6b',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      transitionTimingFunction: {
        control: 'cubic-bezier(0.16, 1, 0.3, 1)',
        settle: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      maxWidth: { shell: '84rem' },
    },
  },
  plugins: [],
};

export default config;
