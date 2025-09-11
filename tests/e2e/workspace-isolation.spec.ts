import { test, expect } from '@playwright/test';

test.describe('Workspace Isolation E2E Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  // Helper function to sign in as different users (simulated with different contexts)
  async function createUserContext(browser: any, userLabel: string) {
    const context = await browser.newContext({
      storageState: undefined, // Start with clean state
      // Simulate different users with different local storage
      extraHTTPHeaders: {
        'X-Test-User': userLabel
      }
    });
    
    const page = await context.newPage();
    return { context, page };
  }

  test('should isolate sessions between different workspaces', async ({ browser }) => {
    // Step 1: Create two user contexts (simulating different workspaces)
    const { page: userAPage, context: userAContext } = await createUserContext(browser, 'userA');
    const { page: userBPage, context: userBContext } = await createUserContext(browser, 'userB');

    try {
      // Step 2: User A creates sessions in their workspace
      await userAPage.goto('/dashboard');
      await userAPage.waitForSelector('[data-testid="dashboard-title"]');
      
      // Create session for User A
      const userASessionTitle = 'User A Private Session ' + Date.now();
      await userAPage.click('[data-testid="create-session-button"]');
      await userAPage.fill('[data-testid="session-title-input"]', userASessionTitle);
      await userAPage.fill('[data-testid="session-description-input"]', 'This should only be visible to User A');
      await userAPage.click('[data-testid="create-session-submit"]');
      
      // Verify User A can see their session
      await expect(userAPage.locator(`[data-testid="session-card"][data-session-title="${userASessionTitle}"]`)).toBeVisible();

      // Step 3: User B creates sessions in their workspace  
      await userBPage.goto('/dashboard');
      await userBPage.waitForSelector('[data-testid="dashboard-title"]');
      
      // Create session for User B
      const userBSessionTitle = 'User B Private Session ' + Date.now();
      await userBPage.click('[data-testid="create-session-button"]');
      await userBPage.fill('[data-testid="session-title-input"]', userBSessionTitle);
      await userBPage.fill('[data-testid="session-description-input"]', 'This should only be visible to User B');
      await userBPage.click('[data-testid="create-session-submit"]');
      
      // Verify User B can see their session
      await expect(userBPage.locator(`[data-testid="session-card"][data-session-title="${userBSessionTitle}"]`)).toBeVisible();

      // Step 4: Verify workspace isolation - User A cannot see User B's sessions
      await userAPage.reload();
      await expect(userAPage.locator(`[data-testid="session-card"][data-session-title="${userBSessionTitle}"]`)).not.toBeVisible();
      await expect(userAPage.locator(`[data-testid="session-card"][data-session-title="${userASessionTitle}"]`)).toBeVisible();

      // Step 5: Verify workspace isolation - User B cannot see User A's sessions  
      await userBPage.reload();
      await expect(userBPage.locator(`[data-testid="session-card"][data-session-title="${userASessionTitle}"]`)).not.toBeVisible();
      await expect(userBPage.locator(`[data-testid="session-card"][data-session-title="${userBSessionTitle}"]`)).toBeVisible();

    } finally {
      // Cleanup contexts
      await userAContext.close();
      await userBContext.close();
    }
  });

  test('should prevent unauthorized access to session URLs', async ({ browser }) => {
    const { page: userAPage, context: userAContext } = await createUserContext(browser, 'userA');
    const { page: userBPage, context: userBContext } = await createUserContext(browser, 'userB');

    try {
      // Step 1: User A creates a session and gets its URL
      await userAPage.goto('/dashboard');
      await userAPage.waitForSelector('[data-testid="dashboard-title"]');
      
      const sessionTitle = 'Protected Session ' + Date.now();
      await userAPage.click('[data-testid="create-session-button"]');
      await userAPage.fill('[data-testid="session-title-input"]', sessionTitle);
      await userAPage.click('[data-testid="create-session-submit"]');
      
      // Navigate to session and extract URL
      await userAPage.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
      await userAPage.waitForURL(/\/sessions\/[a-f0-9-]+$/);
      const sessionUrl = userAPage.url();
      
      // Step 2: Verify User A can access their session
      await expect(userAPage.locator('[data-testid="session-workspace-title"]')).toHaveText(sessionTitle);

      // Step 3: User B tries to access User A's session URL directly
      await userBPage.goto(sessionUrl);
      
      // Step 4: Verify User B is denied access (should show error or redirect)
      await expect(userBPage.locator('[data-testid="access-denied-message"]')).toBeVisible();
      await expect(userBPage.locator('[data-testid="access-denied-message"]')).toContainText('You do not have access to this session');
      
      // Or should redirect to dashboard
      // await expect(userBPage).toHaveURL('/dashboard');
      // await expect(userBPage.locator('[data-testid="error-toast"]')).toContainText('Access denied');

    } finally {
      await userAContext.close();
      await userBContext.close();
    }
  });

  test('should validate workspace context in API requests', async ({ page, context }) => {
    // Step 1: Navigate to dashboard and create a session
    await page.goto('/dashboard');
    const sessionTitle = 'API Validation Test ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionTitle);
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 2: Intercept API requests to verify workspace validation
    const apiRequests: any[] = [];
    
    await page.route('/api/data/**', (route, request) => {
      apiRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postDataJSON(),
        headers: request.headers()
      });
      route.continue();
    });

    // Step 3: Navigate to session to trigger read request
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 4: Make changes to trigger write request
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', 'Updated ' + sessionTitle);
    await page.waitForTimeout(600); // Auto-save

    // Step 5: Verify all API requests include proper workspace validation
    expect(apiRequests.length).toBeGreaterThan(0);
    
    for (const request of apiRequests) {
      expect(request.postData).toBeDefined();
      expect(request.postData.workspaceId).toBeDefined();
      expect(typeof request.postData.workspaceId).toBe('string');
      expect(request.postData.workspaceId).toMatch(/^org_[a-zA-Z0-9]+$/); // Clerk org ID format
    }
  });

  test('should handle authentication redirects for unauthenticated users', async ({ browser }) => {
    // Step 1: Create context without authentication
    const context = await browser.newContext({
      storageState: undefined
    });
    const page = await context.newPage();

    try {
      // Step 2: Try to access dashboard without authentication
      await page.goto('/dashboard');
      
      // Step 3: Verify redirect to sign-in page
      await expect(page).toHaveURL('/sign-in');
      await expect(page.locator('[data-testid="sign-in-form"]')).toBeVisible();
      
      // Step 4: Try to access session URL directly without authentication
      const fakeSessionUrl = '/sessions/fake-session-id-12345';
      await page.goto(fakeSessionUrl);
      
      // Step 5: Verify redirect to sign-in with return URL
      await expect(page).toHaveURL(/\/sign-in(\?.*)?$/);
      
      // Check if return URL is preserved (if implemented)
      const url = page.url();
      if (url.includes('return_url') || url.includes('redirect_url')) {
        expect(url).toContain(encodeURIComponent(fakeSessionUrl));
      }

    } finally {
      await context.close();
    }
  });

  test('should enforce workspace-level permissions for session operations', async ({ browser }) => {
    const { page: adminPage, context: adminContext } = await createUserContext(browser, 'admin');
    const { page: memberPage, context: memberContext } = await createUserContext(browser, 'member');

    try {
      // Step 1: Admin creates a session
      await adminPage.goto('/dashboard');
      const adminSessionTitle = 'Admin Only Session ' + Date.now();
      await adminPage.click('[data-testid="create-session-button"]');
      await adminPage.fill('[data-testid="session-title-input"]', adminSessionTitle);
      await adminPage.click('[data-testid="create-session-submit"]');
      
      // Step 2: Member user tries various operations
      await memberPage.goto('/dashboard');
      
      // Step 3: Verify member cannot see admin's sessions in list
      await expect(memberPage.locator(`[data-testid="session-card"][data-session-title="${adminSessionTitle}"]`)).not.toBeVisible();
      
      // Step 4: Member creates their own session
      const memberSessionTitle = 'Member Session ' + Date.now();
      await memberPage.click('[data-testid="create-session-button"]');
      await memberPage.fill('[data-testid="session-title-input"]', memberSessionTitle);
      await memberPage.click('[data-testid="create-session-submit"]');
      
      // Step 5: Verify proper isolation - each user only sees their own sessions
      await expect(adminPage.locator(`[data-testid="session-card"][data-session-title="${memberSessionTitle}"]`)).not.toBeVisible();
      await expect(memberPage.locator(`[data-testid="session-card"][data-session-title="${adminSessionTitle}"]`)).not.toBeVisible();
      
    } finally {
      await adminContext.close();
      await memberContext.close();
    }
  });

  test('should validate workspace ID in session data paths', async ({ page }) => {
    let interceptedRequests: any[] = [];
    
    // Step 1: Set up request interception to validate data paths
    await page.route('/api/data/**', (route, request) => {
      const postData = request.postDataJSON();
      interceptedRequests.push({
        url: request.url(),
        path: postData?.path,
        workspaceId: postData?.workspaceId
      });
      route.continue();
    });

    // Step 2: Navigate to dashboard and create session
    await page.goto('/dashboard');
    const sessionTitle = 'Path Validation Test ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionTitle);
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 3: Navigate to session workspace
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 4: Trigger various data operations
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', 'Updated Title');
    await page.waitForTimeout(600);
    
    // Step 5: Validate all requests use consistent workspace-scoped paths
    expect(interceptedRequests.length).toBeGreaterThan(0);
    
    const workspaceIds = interceptedRequests.map(req => req.workspaceId).filter(Boolean);
    const uniqueWorkspaceIds = [...new Set(workspaceIds)];
    
    // All requests should use the same workspace ID
    expect(uniqueWorkspaceIds.length).toBe(1);
    
    // All paths should be workspace-scoped
    for (const request of interceptedRequests) {
      if (request.path) {
        expect(request.path).toMatch(/^\/sessions/); // Sessions should be under /sessions path
        expect(request.workspaceId).toBeTruthy(); // Every request should have workspace ID
      }
    }
  });

  test('should handle workspace switching gracefully', async ({ page }) => {
    // Step 1: Create initial session in workspace A
    await page.goto('/dashboard');
    const sessionATitle = 'Workspace A Session ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionATitle);
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 2: Simulate workspace switching (if supported by Clerk UI)
    // This would typically be done through Clerk's organization switcher
    // For testing, we might need to mock the organization context change
    
    await page.evaluate(() => {
      // Simulate organization/workspace context change
      window.localStorage.setItem('test-workspace-switch', 'workspace-b');
    });
    
    // Step 3: Refresh page to simulate workspace context change
    await page.reload();
    
    // Step 4: Verify session from previous workspace is not visible
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${sessionATitle}"]`)).not.toBeVisible();
    
    // Step 5: Verify empty state is shown for new workspace
    await expect(page.locator('[data-testid="empty-sessions-state"]')).toBeVisible();
    
    // Step 6: Create session in new workspace
    const sessionBTitle = 'Workspace B Session ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionBTitle);
    await page.click('[data-testid="create-session-submit"]');
    
    // Step 7: Verify new session is visible in current workspace
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${sessionBTitle}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="session-card"][data-session-title="${sessionATitle}"]`)).not.toBeVisible();
  });
});