import { request } from '@playwright/test'

const MAX_WAIT_MS = 60_000
const POLL_INTERVAL_MS = 2_000

export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost'
  const start = Date.now()

  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const ctx = await request.newContext({ baseURL })
      const response = await ctx.get('/actuator/health', { timeout: 3_000 })
      await ctx.dispose()
      if (response.ok()) {
        return
      }
    } catch {
      // backend not yet ready
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(
    `Backend not ready after ${MAX_WAIT_MS / 1000}s — is the Docker stack running?\n` +
      `  docker compose -f docker-compose.poc.yml up --build -d`
  )
}
