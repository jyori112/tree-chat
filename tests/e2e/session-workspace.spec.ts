import { test, expect } from '@playwright/test';

test.describe('Session Workspace E2E Tests', () => {
  let sessionId: string;
  let sessionTitle: string;
  let sessionDescription: string;

  // Helper function to create a test session and navigate to it
  async function createAndNavigateToSession(page: any, title: string, description: string) {
    await page.goto('/dashboard');
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', title);
    await page.fill('[data-testid="session-description-input"]', description);
    await page.click('[data-testid="create-session-submit"]');
    
    // Navigate to the created session
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${title}"]`);
    await sessionCard.click();
    
    // Extract session ID from URL
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    const url = page.url();
    const id = url.split('/sessions/')[1];
    return id;
  }

  test.beforeEach(async ({ page }) => {
    // Create a test session for each test
    sessionTitle = 'Workspace Test Session ' + Date.now();
    sessionDescription = 'Testing workspace functionality';
    sessionId = await createAndNavigateToSession(page, sessionTitle, sessionDescription);
  });

  test('should display session workspace with correct title and description', async ({ page }) => {
    // Step 1: Verify workspace elements are visible
    await expect(page.locator('[data-testid="session-workspace"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-workspace-title"]')).toHaveText(sessionTitle);
    await expect(page.locator('[data-testid="session-workspace-description"]')).toHaveText(sessionDescription);
    
    // Step 2: Verify navigation elements
    await expect(page.locator('[data-testid="back-to-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-breadcrumb"]')).toBeVisible();
    
    // Step 3: Verify editing elements are present
    await expect(page.locator('[data-testid="session-title-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-description-editor"]')).toBeVisible();
    
    // Step 4: Verify placeholder for future framework integration
    await expect(page.locator('[data-testid="framework-placeholder"]')).toBeVisible();
    await expect(page.locator('[data-testid="framework-placeholder"]')).toContainText('Framework pages will appear here');
  });

  test('should handle session title editing with auto-save', async ({ page }) => {
    const newTitle = 'Updated Workspace Title ' + Date.now();
    
    // Step 1: Click on title to enter edit mode
    await page.click('[data-testid="session-title-editor"]');
    
    // Step 2: Verify edit mode is active
    await expect(page.locator('[data-testid="session-title-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-title-input"]')).toHaveValue(sessionTitle);
    
    // Step 3: Clear and type new title
    await page.fill('[data-testid="session-title-input"]', newTitle);
    
    // Step 4: Wait for auto-save (500ms debounce)
    await page.waitForTimeout(600);
    
    // Step 5: Verify auto-save indicator
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved');
    
    // Step 6: Click outside to exit edit mode
    await page.click('[data-testid="session-workspace"]');
    
    // Step 7: Verify title was updated
    await expect(page.locator('[data-testid="session-workspace-title"]')).toHaveText(newTitle);
    
    // Step 8: Verify persistence by refreshing page
    await page.reload();
    await expect(page.locator('[data-testid="session-workspace-title"]')).toHaveText(newTitle);
  });

  test('should handle session description editing with auto-save', async ({ page }) => {
    const newDescription = 'Updated description with auto-save functionality ' + Date.now();
    
    // Step 1: Click on description to enter edit mode
    await page.click('[data-testid="session-description-editor"]');
    
    // Step 2: Verify edit mode is active
    await expect(page.locator('[data-testid="session-description-textarea"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-description-textarea"]')).toHaveValue(sessionDescription);
    
    // Step 3: Update description
    await page.fill('[data-testid="session-description-textarea"]', newDescription);
    
    // Step 4: Wait for auto-save debounce
    await page.waitForTimeout(600);
    
    // Step 5: Verify auto-save completed
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved');
    
    // Step 6: Exit edit mode
    await page.keyboard.press('Escape');
    
    // Step 7: Verify description was updated
    await expect(page.locator('[data-testid="session-workspace-description"]')).toHaveText(newDescription);
  });

  test('should show auto-save loading states during editing', async ({ page }) => {
    // Step 1: Enter title edit mode
    await page.click('[data-testid="session-title-editor"]');
    
    // Step 2: Start typing to trigger auto-save
    await page.fill('[data-testid="session-title-input"]', 'Typing in progress...');
    
    // Step 3: Verify saving state appears immediately
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saving...');
    
    // Step 4: Wait for save to complete
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 2000 });
    
    // Step 5: Continue typing to test debouncing
    await page.fill('[data-testid="session-title-input"]', 'Still typing more...');
    
    // Step 6: Verify debounce resets the save timer
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saving...');
    await page.waitForTimeout(300); // Still within debounce window
    
    // Step 7: Type more to extend debounce
    await page.type('[data-testid="session-title-input"]', ' and more...');
    
    // Step 8: Wait for final save
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 2000 });
  });

  test('should handle auto-save errors and show retry options', async ({ page }) => {
    // Step 1: Enter edit mode
    await page.click('[data-testid="session-title-editor"]');
    
    // Step 2: Simulate network error by intercepting API calls
    await page.route('/api/data/write', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Step 3: Make changes to trigger auto-save
    await page.fill('[data-testid="session-title-input"]', 'This should fail to save');
    
    // Step 4: Wait for auto-save to attempt and fail
    await page.waitForTimeout(600);
    
    // Step 5: Verify error state is shown
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Save failed');
    await expect(page.locator('[data-testid="auto-save-retry"]')).toBeVisible();
    
    // Step 6: Remove network interception to allow retry
    await page.unroute('/api/data/write');
    
    // Step 7: Click retry button
    await page.click('[data-testid="auto-save-retry"]');
    
    // Step 8: Verify retry attempt succeeds
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 2000 });
  });

  test('should display welcome message for empty sessions', async ({ page }) => {
    // Step 1: Verify welcome message is shown for new session
    await expect(page.locator('[data-testid="session-welcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-welcome-title"]')).toHaveText('Welcome to your session workspace');
    await expect(page.locator('[data-testid="session-welcome-message"]')).toContainText('This is where you\'ll apply thinking frameworks');
    
    // Step 2: Verify guidance for getting started
    await expect(page.locator('[data-testid="getting-started-guide"]')).toBeVisible();
    await expect(page.locator('[data-testid="getting-started-guide"]')).toContainText('Framework pages will be available in future updates');
  });

  test('should handle navigation back to dashboard', async ({ page }) => {
    // Step 1: Verify current location
    await expect(page).toHaveURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 2: Click back to dashboard button
    await page.click('[data-testid="back-to-dashboard"]');
    
    // Step 3: Verify navigation to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
    
    // Step 4: Verify session appears in list with updated last accessed time
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await expect(sessionCard).toBeVisible();
    
    // Step 5: Verify session is now at top of list (most recently accessed)
    const sessionCards = page.locator('[data-testid="session-card"]');
    await expect(sessionCards.nth(0).locator('[data-testid="session-card-title"]')).toHaveText(sessionTitle);
  });

  test('should update session context in navigation breadcrumb', async ({ page }) => {
    // Step 1: Verify breadcrumb shows current session
    await expect(page.locator('[data-testid="session-breadcrumb"]')).toBeVisible();
    await expect(page.locator('[data-testid="breadcrumb-dashboard"]')).toHaveText('Dashboard');
    await expect(page.locator('[data-testid="breadcrumb-session"]')).toHaveText(sessionTitle);
    
    // Step 2: Update session title
    const newTitle = 'Updated Breadcrumb Title ' + Date.now();
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', newTitle);
    await page.waitForTimeout(600); // Auto-save
    await page.click('[data-testid="session-workspace"]');
    
    // Step 3: Verify breadcrumb updates to reflect new title
    await expect(page.locator('[data-testid="breadcrumb-session"]')).toHaveText(newTitle);
    
    // Step 4: Test breadcrumb navigation
    await page.click('[data-testid="breadcrumb-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle keyboard shortcuts in workspace', async ({ page }) => {
    // Step 1: Test Escape key to exit edit modes
    await page.click('[data-testid="session-title-editor"]');
    await expect(page.locator('[data-testid="session-title-input"]')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="session-title-input"]')).not.toBeVisible();
    
    // Step 2: Test Tab navigation between editable elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="session-title-editor"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="session-description-editor"]')).toBeFocused();
    
    // Step 3: Test Enter key to activate edit mode
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="session-description-textarea"]')).toBeVisible();
  });

  test('should maintain session workspace state during browser refresh', async ({ page }) => {
    // Step 1: Make some changes
    const updatedTitle = 'Persistence Test ' + Date.now();
    const updatedDescription = 'Testing state persistence';
    
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', updatedTitle);
    await page.waitForTimeout(600); // Auto-save
    
    await page.click('[data-testid="session-description-editor"]');
    await page.fill('[data-testid="session-description-textarea"]', updatedDescription);
    await page.waitForTimeout(600); // Auto-save
    
    // Step 2: Refresh the page
    await page.reload();
    
    // Step 3: Verify all state is preserved
    await expect(page.locator('[data-testid="session-workspace-title"]')).toHaveText(updatedTitle);
    await expect(page.locator('[data-testid="session-workspace-description"]')).toHaveText(updatedDescription);
    await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}$`));
  });
});