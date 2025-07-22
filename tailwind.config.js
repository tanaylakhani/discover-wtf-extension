export default {
  content: [
    "./entrypoints/**/*.{js,ts,jsx,tsx}", // ✅ all nested files inside entrypoints
    "./components/**/*.{js,ts,jsx,tsx}", // ✅ all nested files inside components
    "./node_modules/@radix-ui/themes/**/*.js", // ✅ for shadcn UI radix themes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
