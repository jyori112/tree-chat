import { test, expect } from '@playwright/test';

test.describe('Session Creation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page
    await page.goto('/dashboard');
    
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="dashboard-title"]');
  });

  test('should complete full session creation journey', async ({ page }) => {
    // Step 1: Navigate to dashboard and verify it loads
    await expect(page.locator('[data-testid="dashboard-title"]')).toHaveText('Tree Chat Dashboard');
    
    // Step 2: Click "Create New Session" button
    await page.click('[data-testid="create-session-button"]');
    
    // Step 3: Verify create session modal opens
    await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-title-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-description-input"]')).toBeVisible();
    
    // Step 4: Fill in session title and description
    const sessionTitle = 'Test Session ' + Date.now();
    const sessionDescription = 'This is a test session for E2E testing';
    
    await page.fill('[data-testid="session-title-input"]', sessionTitle);
    await page.fill('[data-testid="session-description-input"]', sessionDescription);
    
    // Step 5: Submit the form
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 6: Verify modal closes and loading state
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
    
    // Step 7: Verify session appears in session list
    await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`)).toBeVisible();
    
    // Step 8: Verify session card contains correct information
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await expect(sessionCard.locator('[data-testid="session-card-title"]')).toHaveText(sessionTitle);
    await expect(sessionCard.locator('[data-testid="session-card-description"]')).toHaveText(sessionDescription);
    await expect(sessionCard.locator('[data-testid="session-card-created-at"]')).toBeVisible();
    
    // Step 9: Navigate to new session workspace
    await sessionCard.click();
    
    // Step 10: Verify navigation to session workspace
    await expect(page).toHaveURL(/\/sessions\/[a-f0-9-]+$/);
    await expect(page.locator('[data-testid="session-workspace-title"]')).toHaveText(sessionTitle);
    await expect(page.locator('[data-testid="session-workspace-description"]')).toHaveText(sessionDescription);
  });

  test('should validate empty title and prevent submission', async ({ page }) => {
    // Step 1: Open create session modal
    await page.click('[data-testid="create-session-button"]');
    await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    
    // Step 2: Try to submit with empty title
    await page.fill('[data-testid="session-description-input"]', 'Description without title');
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 3: Verify validation error is shown
    await expect(page.locator('[data-testid="title-validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="title-validation-error"]')).toHaveText('Session title is required');
    
    // Step 4: Verify modal remains open
    await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    
    // Step 5: Fix validation by adding title
    await page.fill('[data-testid="session-title-input"]', 'Valid Title');
    
    // Step 6: Verify validation error disappears
    await expect(page.locator('[data-testid="title-validation-error"]')).not.toBeVisible();
    
    // Step 7: Submit should now work
    await page.click('[data-testid="create-session-submit"]');
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
  });

  test('should handle session creation loading states', async ({ page }) => {
    // Step 1: Open create session modal
    await page.click('[data-testid="create-session-button"]');
    
    // Step 2: Fill form
    await page.fill('[data-testid="session-title-input"]', 'Loading Test Session');
    await page.fill('[data-testid="session-description-input"]', 'Testing loading states');
    
    // Step 3: Click submit and verify loading state
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 4: Verify submit button shows loading state
    await expect(page.locator('[data-testid="create-session-submit"]')).toBeDisabled();
    await expect(page.locator('[data-testid="create-session-submit"]')).toContainText('Creating...');
    
    // Step 5: Wait for creation to complete
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible({ timeout: 10000 });
    
    // Step 6: Verify session was created successfully
    await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
  });

  test('should close modal when clicking cancel', async ({ page }) => {
    // Step 1: Open create session modal
    await page.click('[data-testid="create-session-button"]');
    await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    
    // Step 2: Fill some data
    await page.fill('[data-testid="session-title-input"]', 'Should be discarded');
    
    // Step 3: Click cancel button
    await page.click('[data-testid="create-session-cancel"]');
    
    // Step 4: Verify modal closes
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
    
    // Step 5: Reopen modal and verify form is reset
    await page.click('[data-testid="create-session-button"]');
    await expect(page.locator('[data-testid="session-title-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="session-description-input"]')).toHaveValue('');
  });

  test('should handle keyboard navigation and accessibility', async ({ page }) => {
    // Step 1: Navigate to create button using tab
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="create-session-button"]')).toBeFocused();
    
    // Step 2: Open modal with Enter key
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    
    // Step 3: Navigate through form fields with tab
    await expect(page.locator('[data-testid="session-title-input"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="session-description-input"]')).toBeFocused();
    
    // Step 4: Close modal with Escape key
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
  });
});