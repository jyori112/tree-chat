import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard directly (auth is skipped in test environment)
    await page.goto('/dashboard');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-title"]', { timeout: 10000 });
  });

  test('should display dashboard with session list', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Tree Chat/);
    
    // Check dashboard heading
    await expect(page.getByTestId('dashboard-title')).toContainText('Tree Chat Dashboard');
    
    // Check session list is present
    await expect(page.getByTestId('session-list')).toBeVisible();
    
    // Check for sessions count badge
    await expect(page.locator('text=2 total')).toBeVisible();
    
    // Check for New Session button
    await expect(page.getByTestId('create-session-button')).toBeVisible();
  });

  test('should display mock sessions correctly', async ({ page }) => {
    // Check both mock sessions are displayed
    await expect(page.getByText('Project Planning Session')).toBeVisible();
    await expect(page.getByText('Team Meeting Notes')).toBeVisible();
    
    // Check session descriptions
    await expect(page.getByText('Planning the next quarter goals')).toBeVisible();
    await expect(page.getByText('Weekly sync discussion points')).toBeVisible();
    
    // Check delete buttons are present
    expect(await page.locator('[data-testid="session-delete-button"]').count()).toBe(2);
  });

  test('should open and close session creation modal', async ({ page }) => {
    // Click New Session button
    await page.getByTestId('create-session-button').click();
    
    // Check modal is visible
    await expect(page.getByTestId('create-session-modal')).toBeVisible();
    await expect(page.getByText('Create New Session')).toBeVisible();
    
    // Check form fields are present
    await expect(page.getByTestId('session-title-input')).toBeVisible();
    await expect(page.getByTestId('session-description-input')).toBeVisible();
    
    // Check buttons
    await expect(page.getByTestId('create-session-cancel')).toBeVisible();
    await expect(page.getByTestId('create-session-submit')).toBeVisible();
    
    // Create button should be disabled initially
    await expect(page.getByTestId('create-session-submit')).toBeDisabled();
    
    // Close modal by clicking cancel
    await page.getByTestId('create-session-cancel').click();
    
    // Modal should be closed
    await expect(page.getByTestId('create-session-modal')).not.toBeVisible();
  });

  test('should validate session creation form', async ({ page }) => {
    // Open modal
    await page.getByTestId('create-session-button').click();
    
    // Create button should be disabled when title is empty
    await expect(page.getByTestId('create-session-submit')).toBeDisabled();
    
    // Type in title
    await page.getByTestId('session-title-input').fill('Test Session Title');
    
    // Create button should now be enabled
    await expect(page.getByTestId('create-session-submit')).toBeEnabled();
    
    // Clear title
    await page.getByTestId('session-title-input').fill('');
    
    // Create button should be disabled again
    await expect(page.getByTestId('create-session-submit')).toBeDisabled();
  });

  test('should create new session successfully', async ({ page }) => {
    // Open modal
    await page.getByTestId('create-session-button').click();
    
    // Fill form
    await page.getByTestId('session-title-input').fill('E2E Test Session');
    await page.getByTestId('session-description-input').fill('Automated test session');
    
    // Submit form
    await page.getByTestId('create-session-submit').click();
    
    // Modal should close
    await expect(page.getByTestId('create-session-modal')).not.toBeVisible();
    
    // Should be back on dashboard
    await expect(page.getByTestId('dashboard-title')).toBeVisible();
  });

  test('should navigate to session workspace', async ({ page }) => {
    // Click on first session
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Should navigate to session page
    await expect(page).toHaveURL(/\/sessions\/\d+/);
    
    // Check session workspace content
    await expect(page.getByText('Project Planning Session')).toBeVisible();
    await expect(page.getByText('Ready to start thinking')).toBeVisible();
    
    // Check back button
    await expect(page.getByText('← Back')).toBeVisible();
  });

  test('should navigate back from session workspace', async ({ page }) => {
    // Navigate to session
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Click back button
    await page.getByRole('button', { name: '← Back' }).click();
    
    // Should be back on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('dashboard-title')).toBeVisible();
    await expect(page.getByTestId('session-list')).toBeVisible();
  });

  test('should edit session title in workspace', async ({ page }) => {
    // Navigate to session workspace
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Check that session title is displayed
    await expect(page.getByTestId('session-title')).toContainText('Project Planning Session');
    
    // Click on the session title to edit (ContentEditable)
    await page.getByTestId('session-title').click();
    
    // Clear and type new title
    await page.getByTestId('session-title').fill('Updated Project Planning');
    
    // Save by pressing Enter
    await page.getByTestId('session-title').press('Enter');
    
    // Check that title is updated
    await expect(page.getByTestId('session-title')).toContainText('Updated Project Planning');
  });

  test('should cancel session title editing', async ({ page }) => {
    // Navigate to session workspace
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Click on the session title to edit (ContentEditable)
    await page.getByTestId('session-title').click();
    
    // Edit the title
    await page.getByTestId('session-title').fill('This Should Not Be Saved');
    
    // Cancel the changes by pressing Escape
    await page.getByTestId('session-title').press('Escape');
    
    // Check that original title is preserved
    await expect(page.getByTestId('session-title')).toContainText('Project Planning Session');
  });

  test('should validate session title editing', async ({ page }) => {
    // Navigate to session workspace
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Click on the session title to edit (ContentEditable)
    await page.getByTestId('session-title').click();
    
    // Try to clear the title (ContentEditable will revert to original on blur if empty)
    await page.getByTestId('session-title').fill('');
    
    // Click elsewhere to blur and trigger validation
    await page.getByTestId('placeholder-action').click();
    
    // Check that original title is preserved (empty titles are not allowed)
    await expect(page.getByTestId('session-title')).toContainText('Project Planning Session');
  });

  test('should edit session description in workspace', async ({ page }) => {
    // Navigate to session workspace
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Check that session description is displayed
    await expect(page.getByTestId('session-description')).toContainText('Planning the next quarter goals');
    
    // Click on the session description to edit (ContentEditable)
    await page.getByTestId('session-description').click();
    
    // Edit the description
    await page.getByTestId('session-description').fill('Updated project planning goals and objectives');
    
    // Save by clicking elsewhere (blur)
    await page.getByTestId('placeholder-action').click();
    
    // Check that description is updated
    await expect(page.getByTestId('session-description')).toContainText('Updated project planning goals and objectives');
  });

  test('should cancel session description editing', async ({ page }) => {
    // Navigate to session workspace
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Click on the session description to edit (ContentEditable)
    await page.getByTestId('session-description').click();
    
    // Edit the description
    await page.getByTestId('session-description').fill('This description should not be saved');
    
    // Cancel the changes by pressing Escape
    await page.getByTestId('session-description').press('Escape');
    
    // Check that original description is preserved
    await expect(page.getByTestId('session-description')).toContainText('Planning the next quarter goals');
  });

  test('should handle empty session description', async ({ page }) => {
    // Navigate to session workspace
    const firstSession = page.locator('[data-testid="session-card"]').first();
    await firstSession.click();
    
    // Click on the session description to edit (ContentEditable)
    await page.getByTestId('session-description').click();
    
    // Clear the description (empty description should be allowed)
    await page.getByTestId('session-description').fill('');
    
    // Save by clicking elsewhere (blur)
    await page.getByTestId('placeholder-action').click();
    
    // Check that description shows placeholder text
    await expect(page.getByTestId('session-description')).toContainText('Add a description');
  });
});