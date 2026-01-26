import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // @ts-expect-error - Vitest types are not fully compatible with Vite config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true, // Allow access from network (for mobile devices)
    strictPort: false, // Allow fallback to next available port if 5173 is taken
    open: false, // Don't auto-open browser (can be enabled per developer preference)
    cors: true, // Enable CORS for API requests
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for smaller bundle
    minify: 'esbuild', // Use esbuild for faster minification
    target: 'esnext', // Target modern browsers
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    // Optimize chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
  },

  // Development-specific settings
  // Source maps enabled by default in dev mode via Vite
  // Hot Module Replacement (HMR) enabled by default
})
