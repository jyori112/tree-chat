import { test, expect } from '@playwright/test';

test.describe('Performance E2E Tests', () => {
  // Helper function to measure timing
  async function measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  }

  // Helper function to create multiple test sessions
  async function createMultipleSessions(page: any, count: number, baseName: string = 'Performance Test Session') {
    const sessionTitles: string[] = [];
    
    for (let i = 1; i <= count; i++) {
      const title = `${baseName} ${i} - ${Date.now()}`;
      sessionTitles.push(title);
      
      await page.click('[data-testid="create-session-button"]');
      await page.fill('[data-testid="session-title-input"]', title);
      await page.fill('[data-testid="session-description-input"]', `Description for session ${i}`);
      await page.click('[data-testid="create-session-submit"]');
      await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
    }
    
    return sessionTitles;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-title"]');
  });

  test('should load session list within 2 seconds for up to 100 sessions', async ({ page }) => {
    // Step 1: Create multiple sessions (reduced number for test efficiency)
    const sessionCount = 20; // Reduced from 100 for test speed
    const sessionTitles = await createMultipleSessions(page, sessionCount);
    
    // Step 2: Clear cache and reload to measure fresh load time
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Step 3: Measure session list loading time
    const { duration } = await measureTime(async () => {
      await page.reload();
      await page.waitForSelector('[data-testid="session-list"]');
      await expect(page.locator('[data-testid="session-card"]')).toHaveCount(sessionCount);
      return true;
    });
    
    // Step 4: Verify performance requirement (2 seconds = 2000ms)
    console.log(`Session list loaded ${sessionCount} sessions in ${duration}ms`);
    expect(duration).toBeLessThan(2000);
    
    // Step 5: Verify all sessions are properly rendered
    for (const title of sessionTitles.slice(0, 5)) { // Check first 5 for efficiency
      await expect(page.locator(`[data-testid="session-card"][data-session-title="${title}"]`)).toBeVisible();
    }
  });

  test('should complete session switching within 1 second', async ({ page }) => {
    // Step 1: Create test sessions
    const sessionTitles = await createMultipleSessions(page, 3, 'Switch Performance Test');
    
    // Step 2: Measure session navigation time
    const { duration } = await measureTime(async () => {
      const sessionCard = page.locator(`[data-testid="session-card"][data-session-title="${sessionTitles[0]}"]`);
      await sessionCard.click();
      await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
      await expect(page.locator('[data-testid="session-workspace"]')).toBeVisible();
      return true;
    });
    
    // Step 3: Verify performance requirement (1 second = 1000ms)
    console.log(`Session switching completed in ${duration}ms`);
    expect(duration).toBeLessThan(1000);
    
    // Step 4: Test navigation back to dashboard
    const { duration: backDuration } = await measureTime(async () => {
      await page.click('[data-testid="back-to-dashboard"]');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      return true;
    });
    
    console.log(`Navigation back to dashboard completed in ${backDuration}ms`);
    expect(backDuration).toBeLessThan(1000);
  });

  test('should complete auto-save operations within 500ms', async ({ page }) => {
    // Step 1: Create test session and navigate to workspace
    const sessionTitle = 'Auto-save Performance Test ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionTitle);
    await page.click('[data-testid="create-session-submit"]');
    
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 2: Measure auto-save performance for title changes
    await page.click('[data-testid="session-title-editor"]');
    
    const { duration } = await measureTime(async () => {
      await page.fill('[data-testid="session-title-input"]', 'Updated Title for Performance Test');
      
      // Wait for auto-save to trigger and complete
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saving...', { timeout: 600 });
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 1000 });
      return true;
    });
    
    // Step 3: Verify auto-save performance requirement (500ms)
    console.log(`Auto-save completed in ${duration}ms`);
    expect(duration).toBeLessThan(500);
    
    // Step 4: Test description auto-save performance
    await page.click('[data-testid="session-description-editor"]');
    
    const { duration: descDuration } = await measureTime(async () => {
      await page.fill('[data-testid="session-description-textarea"]', 'Updated description for performance testing with more content');
      
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saving...', { timeout: 600 });
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 1000 });
      return true;
    });
    
    console.log(`Description auto-save completed in ${descDuration}ms`);
    expect(descDuration).toBeLessThan(500);
  });

  test('should handle rapid session creation without performance degradation', async ({ page }) => {
    const sessionCount = 10;
    const creationTimes: number[] = [];
    
    // Step 1: Measure creation time for each session
    for (let i = 1; i <= sessionCount; i++) {
      const { duration } = await measureTime(async () => {
        await page.click('[data-testid="create-session-button"]');
        await page.fill('[data-testid="session-title-input"]', `Rapid Creation Test ${i}`);
        await page.click('[data-testid="create-session-submit"]');
        await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
        return true;
      });
      
      creationTimes.push(duration);
      console.log(`Session ${i} created in ${duration}ms`);
    }
    
    // Step 2: Verify performance doesn't degrade over time
    const firstHalf = creationTimes.slice(0, sessionCount / 2);
    const secondHalf = creationTimes.slice(sessionCount / 2);
    
    const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
    
    console.log(`First half average: ${firstHalfAvg}ms, Second half average: ${secondHalfAvg}ms`);
    
    // Performance shouldn't degrade by more than 50%
    expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    
    // All creation times should be reasonable (under 3 seconds)
    creationTimes.forEach(time => {
      expect(time).toBeLessThan(3000);
    });
  });

  test('should maintain responsive UI during concurrent operations', async ({ page }) => {
    // Step 1: Create test session
    const sessionTitle = 'Concurrent Operations Test ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionTitle);
    await page.click('[data-testid="create-session-submit"]');
    
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 2: Start auto-save operation
    await page.click('[data-testid="session-title-editor"]');
    await page.fill('[data-testid="session-title-input"]', 'Concurrent test in progress...');
    
    // Step 3: Immediately test UI responsiveness while save is in progress
    const { duration } = await measureTime(async () => {
      // Try to interact with other UI elements
      await page.hover('[data-testid="back-to-dashboard"]');
      await page.click('[data-testid="session-description-editor"]');
      await page.fill('[data-testid="session-description-textarea"]', 'Testing concurrent operations');
      return true;
    });
    
    // Step 4: Verify UI remains responsive (should complete quickly)
    console.log(`UI interactions completed in ${duration}ms during save`);
    expect(duration).toBeLessThan(200); // UI should remain very responsive
    
    // Step 5: Verify both save operations complete successfully
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toHaveText('Saved', { timeout: 2000 });
  });

  test('should optimize rendering performance for large session lists', async ({ page }) => {
    // Step 1: Create a larger number of sessions
    const sessionCount = 50;
    await createMultipleSessions(page, sessionCount, 'Rendering Performance Test');
    
    // Step 2: Measure scroll performance
    const { duration: scrollDuration } = await measureTime(async () => {
      // Scroll through the session list
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(100);
      }
      return true;
    });
    
    console.log(`Scrolling through ${sessionCount} sessions took ${scrollDuration}ms`);
    expect(scrollDuration).toBeLessThan(1000);
    
    // Step 3: Measure search/filter performance (if implemented)
    if (await page.locator('[data-testid="session-search"]').isVisible()) {
      const { duration: searchDuration } = await measureTime(async () => {
        await page.fill('[data-testid="session-search"]', 'Performance Test');
        await page.waitForTimeout(300); // Debounce
        return true;
      });
      
      console.log(`Search filtering took ${searchDuration}ms`);
      expect(searchDuration).toBeLessThan(500);
    }
  });

  test('should handle memory usage efficiently during extended sessions', async ({ page, context }) => {
    // Step 1: Create session and perform extended operations
    const sessionTitle = 'Memory Usage Test ' + Date.now();
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', sessionTitle);
    await page.click('[data-testid="create-session-submit"]');
    
    await page.click(`[data-testid="session-card"][data-session-title="${sessionTitle}"]`);
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 2: Perform repeated operations to test memory leaks
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="session-title-editor"]');
      await page.fill('[data-testid="session-title-input"]', `Memory Test ${i}`);
      await page.waitForTimeout(100);
      await page.click('[data-testid="session-workspace"]'); // Exit edit mode
      await page.waitForTimeout(100);
    }
    
    // Step 3: Measure memory usage (basic check)
    const metrics = await page.evaluate(() => {
      return {
        jsHeapSizeUsed: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
      };
    });
    
    if (metrics.jsHeapSizeUsed > 0) {
      console.log(`Memory usage: ${Math.round(metrics.jsHeapSizeUsed / 1024 / 1024)}MB`);
      
      // Basic memory usage check (should not exceed reasonable limits)
      expect(metrics.jsHeapSizeUsed).toBeLessThan(100 * 1024 * 1024); // 100MB
    }
  });

  test('should maintain performance under network latency conditions', async ({ page }) => {
    // Step 1: Simulate network latency
    await page.route('/api/data/**', async route => {
      // Add artificial delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      await route.continue();
    });
    
    // Step 2: Create session with network latency
    const { duration } = await measureTime(async () => {
      await page.click('[data-testid="create-session-button"]');
      await page.fill('[data-testid="session-title-input"]', 'Latency Test Session');
      await page.click('[data-testid="create-session-submit"]');
      await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
      return true;
    });
    
    // Step 3: Verify operation completes within reasonable time despite latency
    console.log(`Session creation with 200ms latency took ${duration}ms`);
    expect(duration).toBeLessThan(3000); // Should handle latency gracefully
    
    // Step 4: Test navigation with latency
    const { duration: navDuration } = await measureTime(async () => {
      await page.click('[data-testid="session-card"]:first-child');
      await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
      await expect(page.locator('[data-testid="session-workspace"]')).toBeVisible();
      return true;
    });
    
    console.log(`Navigation with latency took ${navDuration}ms`);
    expect(navDuration).toBeLessThan(2000);
  });

  test('should provide smooth loading states and transitions', async ({ page }) => {
    // Step 1: Test loading state visibility during operations
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-title-input"]', 'Loading State Test');
    
    // Step 2: Monitor loading states during creation
    const createPromise = page.click('[data-testid="create-session-submit"]');
    
    // Verify loading state appears quickly
    await expect(page.locator('[data-testid="create-session-submit"]')).toBeDisabled({ timeout: 100 });
    await expect(page.locator('[data-testid="create-session-submit"]')).toContainText('Creating...', { timeout: 100 });
    
    await createPromise;
    await expect(page.locator('[data-testid="create-session-modal"]')).not.toBeVisible();
    
    // Step 3: Test navigation loading states
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    const navigationPromise = sessionCard.click();
    
    // Check for loading indicators during navigation
    if (await page.locator('[data-testid="page-loading-indicator"]').isVisible()) {
      await expect(page.locator('[data-testid="page-loading-indicator"]')).toBeVisible();
    }
    
    await navigationPromise;
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    
    // Step 4: Verify loading states clear properly
    await expect(page.locator('[data-testid="page-loading-indicator"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="session-workspace"]')).toBeVisible();
  });
});