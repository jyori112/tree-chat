import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display homepage and authentication options', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads successfully
    await expect(page).toHaveTitle(/Tree Chat/);
    
    // Check for basic page structure
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    
    // The sign-in page should be accessible
    await expect(page.locator('body')).toBeVisible();
    
    // Wait for page to load completely, but with shorter timeout
    await page.waitForLoadState('domcontentloaded');
  });

  test('should navigate to sign-up page', async ({ page }) => {
    await page.goto('/sign-up');
    
    // The sign-up page should be accessible
    await expect(page.locator('body')).toBeVisible();
    
    // Wait for page to load completely, but with shorter timeout
    await page.waitForLoadState('domcontentloaded');
  });

  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to sign-in page when not authenticated
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator('h2')).toContainText('Sign in to Tree Chat');
  });

  test('should complete full login flow with valid credentials', async ({ page }) => {
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
    await expect(page.locator('h2')).toContainText('Welcome to Tree Chat');
    
    // Verify user is authenticated by checking for user button
    await expect(page.locator('button[aria-label*="user button"], button:has-text("Open user button")')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for form to load
    await page.waitForSelector('input[placeholder*="email"]', { timeout: 10000 });
    
    // Fill in invalid email
    await page.getByRole('textbox', { name: /email address or username/i }).fill('invalid@example.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    
    // Should show error message for non-existent account
    await expect(page.locator('text=Couldn\'t find your account')).toBeVisible({ timeout: 5000 });
  });
});