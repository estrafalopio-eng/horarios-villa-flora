/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      colors: {
        // Official I.E. Villa Flora Corporate Palette
        'villa-blue-light': '#007DC5',
        'villa-blue-dark': '#034EA2',
        'villa-magenta': '#ED145B', // Strict alerts, errors, notifications ONLY
        'villa-dark': '#231F20',    // Main text
        'villa-gray': '#939598',    // Borders and secondary text
        brand: {
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#b9e2fe',
          300: '#87d1fd',
          400: '#4fb6fb',
          500: '#2798f5',
          600: '#117ae8',
          700: '#0c61c7',
          800: '#0f4f9f',
          900: '#12437e',
          950: '#0c2a52',
        },
        school: {
          primary: '#1e3a8a',   // Institución Educativa Villa Flora deep navy
          secondary: '#0284c7', // Sky blue
          accent: '#10b981',    // Emerald green
          warning: '#f59e0b',   // Amber for pending Maker-Checker
          danger: '#ef4444',    // Red for absence
          success: '#10b981',   // Green for covered
        },
      },
    },
  },
  plugins: [],
};
