import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'
  const isProduction = mode === 'production'

  const config: UserConfig = {
    plugins: [
      react(),
      // Bundle analyzer - generates stats.html in dist folder
      // Run with: npm run build:analyze
      // Or automatically in development mode
      ...(isDevelopment || process.env.ANALYZE === 'true'
        ? [
            visualizer({
              open: false, // Don't auto-open (set to true if desired)
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              template: 'treemap', // 'treemap' | 'sunburst' | 'network'
            }),
          ]
        : []),
    ],
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

    // Build configuration - environment-specific
    build: {
      outDir: 'dist',
      
      // Source maps: enabled in development, disabled in production
      sourcemap: isDevelopment,
      
      // Minification: enabled in production, disabled in development
      minify: isProduction ? 'esbuild' : false,
      
      // Target modern browsers for optimal performance
      target: 'esnext',
      
      // Chunking strategy for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
          },
          // Warn on large assets
          assetFileNames: (assetInfo) => {
            if (assetInfo.size && assetInfo.size > 500000) {
              // 500KB threshold
              console.warn(
                `⚠️  Large asset detected: ${assetInfo.name} (${(assetInfo.size / 1024).toFixed(2)} KB)`
              );
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      
      // Optimize chunk size warnings threshold
      chunkSizeWarningLimit: 1000,
      
      // Production optimizations
      ...(isProduction && {
        // Report compressed size (helps identify optimization opportunities)
        reportCompressedSize: true,
        
        // Optimize CSS
        cssCodeSplit: true,
        
        // Generate manifest for better caching
        manifest: true,
      }),
    },

    // Development-specific settings
    ...(isDevelopment && {
      // Source maps enabled for debugging
      // Already set in build.sourcemap above
      
      // Hot Module Replacement (HMR) enabled by default
      // Fast refresh enabled by @vitejs/plugin-react
    }),
  }

  return config
})
