/** @type {import("prettier").Config} */
const config = {
  printWidth: 120,
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4: the plugin reads the theme from here to sort classes.
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
