/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'Courier Prime', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#000000',
        paper: '#ffffff',
        muted: '#666666',
        faint: '#e0e0e0',
      },
    },
  },
  plugins: [],
}
