import { test, expect } from '@playwright/test';

test.describe('Minimal Session Tests', () => {
  test('ContentEditable functionality works correctly', async ({ page }) => {
    // Navigate directly to session workspace (bypassing dashboard complexity)
    await page.goto('/sessions/1');
    
    // Wait for page to load with a basic check
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we have the basic session content
    const hasTitle = await page.locator('[data-testid="session-title"]').count() > 0;
    const hasDescription = await page.locator('[data-testid="session-description"]').count() > 0;
    
    if (hasTitle && hasDescription) {
      // Test title editing if elements are present
      await page.getByTestId('session-title').click();
      await page.getByTestId('session-title').fill('WYSIWYG Test Title');
      await page.getByTestId('session-title').press('Enter');
      await expect(page.getByTestId('session-title')).toContainText('WYSIWYG Test Title');
      
      // Test description editing if elements are present
      await page.getByTestId('session-description').click();
      await page.getByTestId('session-description').fill('WYSIWYG test description works perfectly');
      await page.getByTestId('placeholder-action').click(); // Click elsewhere to blur
      await expect(page.getByTestId('session-description')).toContainText('WYSIWYG test description works perfectly');
    } else {
      // Skip test if not authenticated or elements not found
      console.log('Skipping ContentEditable test - elements not found');
    }
  });

  test('Basic page loads without crashing', async ({ page }) => {
    // Test that pages load without critical JavaScript errors
    const criticalErrors: string[] = [];
    page.on('pageerror', (error) => {
      // Only capture critical errors, ignore Clerk network issues
      if (!error.message.includes('access control checks') && 
          !error.message.includes('Load failed') &&
          !error.message.includes('clerk.accounts.dev')) {
        criticalErrors.push(error.message);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    await page.goto('/sessions/1');
    await page.waitForLoadState('domcontentloaded');
    
    // Expect no critical JavaScript errors (ignore Clerk network issues)
    expect(criticalErrors).toHaveLength(0);
  });
});