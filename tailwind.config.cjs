/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff6b35',
          hover: '#ff8655',
          active: '#e55525',
        },
        bg: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1a1a1a',
          elevated: '#1f1f1f',
          hover: '#242424',
          active: '#2a2a2a',
        },
        surface: {
          primary: '#1a1a1a',
          secondary: '#242424',
          tertiary: '#2a2a2a',
          hover: '#303030',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a8a8a8',
          tertiary: '#707070',
          disabled: '#4a4a4a',
        },
        border: {
          primary: '#2a2a2a',
          secondary: '#353535',
          hover: '#404040',
          focus: '#ff6b35',
        },
        // Legacy colors for backward compatibility
        'user-message-bg': '#1a1a1a',
        'custom-dark-bg': '#0a0a0a',
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
}; 