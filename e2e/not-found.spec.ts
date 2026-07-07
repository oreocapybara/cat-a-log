import { test, expect } from '@playwright/test'

// Unauthenticated: unknown routes go through proxy and redirect to /login
test.use({ storageState: { cookies: [], origins: [] } })

test('visiting unknown route redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/some-bogus-url-that-does-not-exist')
  // Proxy catches unknown routes as non-public → redirect to login
  await expect(page).toHaveURL(/\/login/)
})
