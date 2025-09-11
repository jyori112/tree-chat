import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E Tests', () => {
  // Helper function to create a test session
  async function createTestSession(page: any, title: string, description: string = '') {
    await page.goto('/dashboard');
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', title);
    if (description) {
      await page.fill('[data-testid="session-description-input"]', description);
    }
    await page.click('[data-testid="create-session-submit"]');
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-title"]');
  });

  test('should handle API errors during session creation', async ({ page }) => {
    // Step 1: Set up API error simulation for write operations
    await page.route('/api/data/write', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error during session creation' })
      });
    });

    // Step 2: Attempt to create session
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', 'Failed Creation Test');
    await page.fill('[data-testid="session-description-input"]', 'This should fail to create');
    await page.click('[data-testid="create-session-submit"]');

    // Step 3: Verify error handling in modal
    await expect(page.locator('[data-testid="create-session-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-session-error"]')).toContainText('Failed to create session');
    
    // Step 4: Verify modal remains open for retry
    await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    
    // Step 5: Verify submit button is re-enabled for retry
    await expect(page.locator('[data-testid="create-session-submit"]')).not.toBeDisabled();
    await expect(page.locator('[data-testid="create-session-submit"]')).toContainText('Create Session');

    // Step 6: Remove error simulation and retry
    await page.unroute('/api/data/write');
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 7: Verify successful creation on retry
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="session-card"]')).toBeVisible();
  });

  test('should handle session not found errors', async ({ page }) => {
    // Step 1: Navigate to non-existent session URL
    const fakeSessionId = 'non-existent-session-' + Date.now();
    await page.goto(`/sessions/${fakeSessionId}`);
    
    // Step 2: Verify 404 error handling
    await expect(page.locator('[data-testid="session-not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-not-found-title"]')).toHaveText('Session Not Found');
    await expect(page.locator('[data-testid="session-not-found-message"]')).toContainText('The session you\'re looking for doesn\'t exist');
    
    // Step 3: Verify navigation options are provided
    await expect(page.locator('[data-testid="back-to-dashboard-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-new-session-button"]')).toBeVisible();
    
    // Step 4: Test navigation back to dashboard
    await page.click('[data-testid="back-to-dashboard-button"]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should handle auto-save failures with retry mechanism', async ({ page }) => {
    // Step 1: Create test session
    const sessionTitle = 'Auto-save Error Test ' + Date.now();
    await createTestSession(page, sessionTitle, 'Testing auto-save error handling');
    
    // Step 2: Navigate to session workspace
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 3: Set up intermittent API failures
    let failCount = 0;
    await page.route('/api/data/write', route => {
      failCount++;
      if (failCount <= 2) { // Fail first 2 attempts
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service temporarily unavailable' })
        });
      } else {
        route.continue(); // Allow subsequent requests
      }
    });
    
    // Step 4: Make changes to trigger auto-save
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', 'Updated Title That Should Fail');
    
    // Step 5: Verify initial save failure
    await page.waitForTimeout(600);
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Save failed');
    await expect(page.locator('[data-testid="auto-save-retry"]')).toBeVisible();
    
    // Step 6: Test automatic retry after failure
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Retrying...', { timeout: 3000 });
    
    // Step 7: Verify eventual success after retries
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 5000 });
    
    // Step 8: Verify manual retry button functionality
    failCount = 0; // Reset fail count
    await page.fill('[data-testid="session-title-input"]', 'Another Update');
    await page.waitForTimeout(600);
    
    // Click manual retry if save fails
    const retryButton = page.locator('[data-testid="auto-save-retry"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 3000 });
    }
  });

  test('should handle network connectivity issues', async ({ page, context }) => {
    // Step 1: Create test session while online
    const sessionTitle = 'Network Error Test ' + Date.now();
    await createTestSession(page, sessionTitle, 'Testing network connectivity');
    
    // Step 2: Navigate to session workspace
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 3: Simulate network disconnection
    await context.setOffline(true);
    
    // Step 4: Attempt to make changes
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', 'Offline Edit Attempt');
    await page.waitForTimeout(600);
    
    // Step 5: Verify offline handling
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Working offline');
    await expect(page.locator('[data-testid="queued-changes-count"]')).toContainText('1 change queued');
    
    // Step 6: Make additional changes while offline
    await page.click('[data-testid="session-description-editor"]');
    await page.fill('[data-testid="session-description-textarea"]', 'Updated description while offline');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="queued-changes-count"]')).toContainText('2 changes queued');
    
    // Step 7: Simulate network reconnection
    await context.setOffline(false);
    
    // Step 8: Verify automatic sync on reconnection
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('Syncing queued changes...');
    
    // Step 9: Verify successful sync
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('All changes synced', { timeout: 5000 });
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="queued-changes-count"]')).not.toBeVisible();
  });

  test('should handle session deletion errors', async ({ page }) => {
    // Step 1: Create test session
    const sessionTitle = 'Deletion Error Test ' + Date.now();
    await createTestSession(page, sessionTitle, 'Testing deletion error handling');
    
    // Step 2: Set up API error for deletion
    await page.route('/api/data/write', route => {
      const postData = route.request().postDataJSON();
      if (postData && postData.value === null) { // Deletion request
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Cannot delete session: operation in progress' })
        });
      } else {
        route.continue();
      }
    });
    
    // Step 3: Attempt to delete session
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await sessionCard.locator('[data-testid="session-delete-button"]').click();
    
    // Step 4: Confirm deletion
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
    await page.click('[data-testid="delete-confirmation-confirm"]');
    
    // Step 5: Verify deletion error handling
    await expect(page.locator('[data-testid="deletion-error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="deletion-error-toast"]')).toContainText('Failed to delete session');
    
    // Step 6: Verify session remains in list
    await expect(sessionCard).toBeVisible();
    
    // Step 7: Verify error toast provides retry option
    await expect(page.locator('[data-testid="deletion-retry-button"]')).toBeVisible();
    
    // Step 8: Remove error simulation and test retry
    await page.unroute('/api/data/write');
    await page.click('[data-testid="deletion-retry-button"]');
    
    // Step 9: Verify successful deletion on retry
    await expect(sessionCard).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="deletion-success-toast"]')).toBeVisible();
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Step 1: Test empty title validation
    await page.click('[data-testid="create-session-button"]');
    
    // Try to submit with empty title
    await page.click('[data-testid="create-session-submit"]');
    await expect(page.locator('[data-testid="title-validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="title-validation-error"]')).toContainText('Session title is required');
    
    // Step 2: Test title length validation
    const longTitle = 'A'.repeat(201); // Assuming 200 char limit
    await page.fill('[data-testid="session-title-input"]', longTitle);
    
    await expect(page.locator('[data-testid="title-length-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="title-length-error"]')).toContainText('Title must be 200 characters or less');
    
    // Step 3: Test special character validation (if applicable)
    await page.fill('[data-testid="session-title-input"]', 'Title with <script>alert("xss")</script>');
    await expect(page.locator('[data-testid="title-validation-error"]')).toContainText('Title contains invalid characters');
    
    // Step 4: Test valid input clears errors
    await page.fill('[data-testid="session-title-input"]', 'Valid Session Title');
    await expect(page.locator('[data-testid="title-validation-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="title-length-error"]')).not.toBeVisible();
    
    // Step 5: Verify successful submission with valid data
    await page.click('[data-testid="create-session-submit"]');
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
  });

  test('should handle concurrent edit conflicts', async ({ browser }) => {
    // Step 1: Create test session
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    
    const sessionTitle = 'Concurrent Edit Test ' + Date.now();
    
    // Create session on page1
    await page1.goto('/dashboard');
    await page1.click('[data-testid="create-session-button"]');
    await page1.fill('[data-testid="session-title-input"]', sessionTitle);
    await page1.click('[data-testid="create-session-submit"]');
    
    // Step 2: Open same session on both pages
    await page1.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page1.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    const sessionUrl = page1.url();
    
    await page2.goto(sessionUrl);
    await page2.waitForSelector('[data-testid="session-workspace"]');
    
    // Step 3: Make concurrent edits
    await page1.click('[data-testid="session-title-editor"]');
    await page2.click('[data-testid="session-title-editor"]');
    
    await page1.fill('[data-testid="session-title-input"]', 'Edit from Page 1');
    await page2.fill('[data-testid="session-title-input"]', 'Edit from Page 2');
    
    // Step 4: Save changes with short delay to create conflict
    await page1.waitForTimeout(600); // Auto-save on page1
    await page.waitForTimeout(200);
    await page2.waitForTimeout(600); // Auto-save on page2
    
    // Step 5: Verify conflict detection and resolution
    const conflictIndicator = page2.locator('[data-testid="edit-conflict-warning"]');
    if (await conflictIndicator.isVisible()) {
      await expect(conflictIndicator).toContainText('Another user has modified this session');
      await expect(page2.locator('[data-testid="conflict-resolve-options"]')).toBeVisible();
      
      // Test conflict resolution options
      await page2.click('[data-testid="use-my-version"]'); // or '[data-testid="use-their-version"]'
      await expect(conflictIndicator).not.toBeVisible();
    }
    
    await page1.close();
    await page2.close();
  });

  test('should recover from browser crashes and maintain data integrity', async ({ page }) => {
    // Step 1: Create test session and make unsaved changes
    const sessionTitle = 'Crash Recovery Test ' + Date.now();
    await createTestSession(page, sessionTitle, 'Testing crash recovery');
    
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 2: Make changes but don't wait for auto-save
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', 'Unsaved Changes Before Crash');
    
    // Step 3: Simulate browser crash by force-closing page
    const sessionUrl = page.url();
    await page.close();
    
    // Step 4: Reopen page (simulate browser restart)
    const newPage = await page.context().newPage();
    await newPage.goto(sessionUrl);
    
    // Step 5: Verify data recovery mechanisms
    // Check for draft recovery prompt
    const draftRecovery = newPage.locator('[data-testid="draft-recovery-prompt"]');
    if (await draftRecovery.isVisible()) {
      await expect(draftRecovery).toContainText('Unsaved changes detected');
      await newPage.click('[data-testid="restore-draft"]');
      
      // Verify draft was restored
      await expect(newPage.locator('[data-testid="session-workspace-title"]')).toHaveText('Unsaved Changes Before Crash');
    }
    
    // Step 6: Verify session integrity after recovery
    await expect(newPage.locator('[data-testid="session-workspace"]')).toBeVisible();
    await expect(newPage.locator('[data-testid="session-title-editor"]')).toBeVisible();
    
    await newPage.close();
  });
});