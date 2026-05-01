/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/web/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tealBrand: "var(--color-teal-brand)",
        tealSoft: "var(--color-teal-soft)",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(8, 47, 73, 0.08)",
      },
    },
  },
  plugins: [],
};
