/** @type {import('tailwindcss').Config} */
// Tailwind v4 uses CSS-first configuration via @theme in CSS files
// This file is kept for plugins and compatibility
export default {
  // Content is auto-detected in v4, but we can still specify for clarity
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './index.html',
  ],
}
