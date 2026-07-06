import { test, expect } from '@playwright/test'

// 404 page should be accessible without auth
test.use({ storageState: { cookies: [], origins: [] } })

test('visiting unknown route shows branded 404', async ({ page }) => {
  await page.goto('/some-bogus-url-that-does-not-exist')
  await expect(page.getByText(/not found|404/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /map|home|back/i })).toBeVisible()
})
