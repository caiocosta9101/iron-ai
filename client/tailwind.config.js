/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#13ec6a",           // Verde Neon
        "background-dark": "#102217", // Fundo principal
        "glass-border": "rgba(50, 103, 71, 0.5)",
        "input-bg": "#193324",
        "input-border": "#326747",
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
      },
      backgroundImage: {
        'fitness': "radial-gradient(circle at center, rgba(19, 236, 106, 0.05) 0%, rgba(16, 34, 23, 1) 100%), url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')",
      }
    },
  },
  plugins: [],
}