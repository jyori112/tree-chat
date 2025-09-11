import { test, expect } from '@playwright/test';

test.describe('Session Management E2E Tests', () => {
  // Helper function to create a test session
  async function createTestSession(page: any, title: string, description: string = '') {
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', title);
    if (description) {
      await page.fill('[data-testid="session-description-input"]', description);
    }
    await page.click('[data-testid="create-session-submit"]');
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page
    await page.goto('/dashboard');
    
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="dashboard-title"]');
  });

  test('should display session list with proper sorting by last accessed', async ({ page }) => {
    // Step 1: Create multiple test sessions
    const session1Title = 'First Session ' + Date.now();
    const session2Title = 'Second Session ' + Date.now();
    const session3Title = 'Third Session ' + Date.now();
    
    await createTestSession(page, session1Title, 'First session description');
    await createTestSession(page, session2Title, 'Second session description');
    await createTestSession(page, session3Title, 'Third session description');
    
    // Step 2: Verify session list is visible and contains all sessions
    await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-card"]')).toHaveCount(3);
    
    // Step 3: Verify sessions are sorted by creation time (most recent first)
    const sessionCards = page.locator('[data-testid="session-card"]');
    await expect(sessionCards.nth(0).locator('[data-testid="session-card-title"]')).toHaveText(session3Title);
    await expect(sessionCards.nth(1).locator('[data-testid="session-card-title"]')).toHaveText(session2Title);
    await expect(sessionCards.nth(2).locator('[data-testid="session-card-title"]')).toHaveText(session1Title);
    
    // Step 4: Click on second session to access it
    await sessionCards.nth(1).click();
    await expect(page).toHaveURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 5: Navigate back to dashboard
    await page.click('[data-testid="back-to-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Step 6: Verify session list is re-sorted (accessed session should be first)
    const updatedSessionCards = page.locator('[data-testid="session-card"]');
    await expect(updatedSessionCards.nth(0).locator('[data-testid="session-card-title"]')).toHaveText(session2Title);
  });

  test('should navigate from session list to session workspace', async ({ page }) => {
    // Step 1: Create a test session
    const sessionTitle = 'Navigation Test Session ' + Date.now();
    const sessionDescription = 'Testing navigation from list to workspace';
    
    await createTestSession(page, sessionTitle, sessionDescription);
    
    // Step 2: Click on session card
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await sessionCard.click();
    
    // Step 3: Verify navigation to session workspace
    await expect(page).toHaveURL(/\/sessions\/[a-f0-9-]+$/);
    await expect(page.locator('[data-testid="session-workspace-title"]')).toHaveText(sessionTitle);
    await expect(page.locator('[data-testid="session-workspace-description"]')).toHaveText(sessionDescription);
    
    // Step 4: Verify workspace elements are present
    await expect(page.locator('[data-testid="session-title-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-description-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-dashboard"]')).toBeVisible();
    
    // Step 5: Verify navigation back to dashboard works
    await page.click('[data-testid="back-to-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
  });

  test('should delete session with confirmation dialog', async ({ page }) => {
    // Step 1: Create test sessions
    const sessionToKeep = 'Keep This Session ' + Date.now();
    const sessionToDelete = 'Delete This Session ' + Date.now();
    
    await createTestSession(page, sessionToKeep, 'This session should remain');
    await createTestSession(page, sessionToDelete, 'This session will be deleted');
    
    // Step 2: Verify both sessions exist
    await expect(page.locator('[data-testid="session-card"]')).toHaveCount(2);
    
    // Step 3: Click delete button on target session
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionToDelete}"]`);
    await sessionCard.locator('[data-testid="session-delete-button"]').click();
    
    // Step 4: Verify confirmation dialog appears
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-confirmation-title"]')).toHaveText('Delete Session');
    await expect(page.locator('[data-testid="delete-confirmation-message"]')).toContainText(sessionToDelete);
    
    // Step 5: Click cancel to test cancellation
    await page.click('[data-testid="delete-confirmation-cancel"]');
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="session-card"]')).toHaveCount(2); // Still 2 sessions
    
    // Step 6: Try delete again and confirm
    await sessionCard.locator('[data-testid="session-delete-button"]').click();
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
    await page.click('[data-testid="delete-confirmation-confirm"]');
    
    // Step 7: Verify deletion completed
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="session-card"]')).toHaveCount(1);
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${sessionToDelete}"]`)).not.toBeVisible();
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${sessionToKeep}"]`)).toBeVisible();
  });

  test('should handle session renaming from session list', async ({ page }) => {
    // Step 1: Create test session
    const originalTitle = 'Original Title ' + Date.now();
    const newTitle = 'Updated Title ' + Date.now();
    
    await createTestSession(page, originalTitle, 'Session for rename testing');
    
    // Step 2: Click on session title to edit (if inline editing is supported)
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${originalTitle}"]`);
    await sessionCard.locator('[data-testid="session-card-title"]').dblclick();
    
    // Step 3: Verify edit mode is activated
    await expect(page.locator('[data-testid="session-title-inline-editor"]')).toBeVisible();
    
    // Step 4: Update title
    await page.fill('[data-testid="session-title-inline-editor"]', newTitle);
    await page.keyboard.press('Enter');
    
    // Step 5: Verify title was updated
    await expect(page.locator('[data-testid="session-title-inline-editor"]')).not.toBeVisible();
    await expect(sessionCard.locator('[data-testid="session-card-title"]')).toHaveText(newTitle);
    
    // Step 6: Verify update persisted by refreshing page
    await page.reload();
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${newTitle}"]`)).toBeVisible();
  });

  test('should display empty state when no sessions exist', async ({ page }) => {
    // Step 1: Verify empty state is shown (assuming clean slate)
    const sessionCards = page.locator('[data-testid="session-card"]');
    const sessionCount = await sessionCards.count();
    
    if (sessionCount === 0) {
      // Step 2: Verify empty state elements
      await expect(page.locator('[data-testid="empty-sessions-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-sessions-title"]')).toHaveText('No Sessions Yet');
      await expect(page.locator('[data-testid="empty-sessions-message"]')).toContainText('Create your first session');
      await expect(page.locator('[data-testid="empty-sessions-create-button"]')).toBeVisible();
      
      // Step 3: Test creating session from empty state
      await page.click('[data-testid="empty-sessions-create-button"]');
      await expect(page.locator('[data-testid="create-session-modal"]')).toBeVisible();
    }
  });

  test('should handle session card hover states and interactions', async ({ page }) => {
    // Step 1: Create test session
    const sessionTitle = 'Hover Test Session ' + Date.now();
    await createTestSession(page, sessionTitle, 'Testing hover interactions');
    
    // Step 2: Test hover state
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await sessionCard.hover();
    
    // Step 3: Verify action buttons become visible on hover
    await expect(sessionCard.locator('[data-testid="session-actions"]')).toBeVisible();
    await expect(sessionCard.locator('[data-testid="session-delete-button"]')).toBeVisible();
    await expect(sessionCard.locator('[data-testid="session-edit-button"]')).toBeVisible();
    
    // Step 4: Move away and verify actions are hidden
    await page.hover('[data-testid="dashboard-title"]');
    await expect(sessionCard.locator('[data-testid="session-actions"]')).not.toBeVisible();
  });

  test('should show session metadata correctly', async ({ page }) => {
    // Step 1: Create test session
    const sessionTitle = 'Metadata Test Session ' + Date.now();
    const sessionDescription = 'Testing metadata display';
    
    await createTestSession(page, sessionTitle, sessionDescription);
    
    // Step 2: Verify metadata is displayed correctly
    const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    
    await expect(sessionCard.locator('[data-testid="session-card-title"]')).toHaveText(sessionTitle);
    await expect(sessionCard.locator('[data-testid="session-card-description"]')).toHaveText(sessionDescription);
    await expect(sessionCard.locator('[data-testid="session-card-created-at"]')).toBeVisible();
    await expect(sessionCard.locator('[data-testid="session-card-last-accessed"]')).toBeVisible();
    
    // Step 3: Verify date formats are human readable
    const createdAtText = await sessionCard.locator('[data-testid="session-card-created-at"]').textContent();
    const lastAccessedText = await sessionCard.locator('[data-testid="session-card-last-accessed"]').textContent();
    
    expect(createdAtText).toMatch(/Created|created/i);
    expect(lastAccessedText).toMatch(/Last accessed|accessed/i);
  });
});