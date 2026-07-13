import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Ensure a single React instance (avoids "Invalid hook call" from duplicates).
    dedupe: ['react', 'react-dom'],
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
  },
})
