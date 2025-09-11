import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to sign-in page
  await page.goto('/sign-in');
  
  // Wait for Clerk sign-in form to load
  await page.waitForSelector('input[placeholder*="email"]', { timeout: 10000 });
  
  // Fill in email address
  const testEmail = process.env.TEST_EMAIL || 'jyori112+test-claude-code@gmail.com';
  const testPassword = process.env.TEST_PASSWORD || 'ClaudeTest2025!';
  
  await page.getByRole('textbox', { name: /email address or username/i }).fill(testEmail);
  
  // Click Continue to proceed to password step
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  
  // Wait for password step and fill password
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.getByRole('textbox', { name: /password/i }).fill(testPassword);
  
  // Submit login
  await page.getByRole('button', { name: 'Continue' }).click();
  
  // Should redirect to dashboard after successful login
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  
  // Verify dashboard content is displayed
  await expect(page.locator('h1')).toContainText('Tree Chat Dashboard');
  await expect(page.locator('h2')).toContainText('Your Sessions');
  
  // End of authentication steps - save auth state
  await page.context().storageState({ path: authFile });
});