import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Git worktrees are full checkouts; don't run their copies of the tests.
    exclude: [...configDefaults.exclude, '.worktrees/**', '.claude/worktrees/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // `server-only` / `client-only` throw unless resolved with the bundler's
      // react-server (or client) condition, which Vitest doesn't set. Point both
      // markers at their no-op entry so server and client modules are testable.
      'server-only': resolve(__dirname, './node_modules/server-only/empty.js'),
      'client-only': resolve(__dirname, './node_modules/client-only/index.js'),
    },
  },
})
