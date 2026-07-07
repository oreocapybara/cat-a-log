import { test, expect } from '@playwright/test'

// Map is a public route — no auth needed
test.use({ storageState: { cookies: [], origins: [] } })

test('map page loads without crashing', async ({ page }) => {
  await page.goto('/map')
  // Should stay on /map (public route, no redirect)
  await expect(page).toHaveURL(/\/map/)
  // Page should render something (map skeleton or the actual map)
  await expect(page.locator('body')).not.toBeEmpty()
})
