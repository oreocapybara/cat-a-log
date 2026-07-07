import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Navigate to login to establish a browser context
  await page.goto('/login')

  // In a real E2E environment with a test user, you would:
  // 1. Fill in credentials and submit
  // 2. Wait for redirect to /map
  // For now, store the unauthenticated state — tests that need auth
  // handle the redirect gracefully
  await page.context().storageState({ path: authFile })
})
