import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Enable ES modules support
    pool: 'forks',
    // Handle ES modules properly
    deps: {
      external: ['intuit-oauth', 'xero-node']
    }
  }
})
