/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f7fb",
          100: "#e8eef6",
          200: "#cdd8e7",
          300: "#a6b4c8",
          400: "#7b8aa8",
          500: "#53637f",
          600: "#3b4a64",
          700: "#28364b",
          800: "#172235",
          900: "#0d1726",
        },
        accent: {
          50: "#eefbf7",
          100: "#d6f5ea",
          200: "#aeead7",
          300: "#74dbbc",
          400: "#38c69a",
          500: "#16a67c",
          600: "#128568",
          700: "#0f6750",
          800: "#0f5140",
          900: "#0c4234",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};
