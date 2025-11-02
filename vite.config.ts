import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {},
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split wallet SDKs into separate chunks (lazy-loaded)
          'wallet-coinbase': ['@coinbase/wallet-sdk'],
          'wallet-walletconnect': ['@walletconnect/ethereum-provider', '@reown/appkit'],
          // Core libraries
          'ethers': ['ethers'],
          'wagmi': ['wagmi', 'viem'],
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'react-query': ['@tanstack/react-query'],
          // UI component libraries
          'ui-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            '@radix-ui/react-slot',
            '@radix-ui/react-separator',
          ],
          // Chart library (if using on specific pages)
          'charts': ['recharts'],
        },
      },
    },
  },
})
