import { test, expect } from '@playwright/test';

test.describe('Deep Research Functionality', () => {
  test('should navigate to sessions and create a deep research page', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Navigate to sessions
    await expect(page).toHaveTitle(/Tree Chat/);
    await page.waitForLoadState('networkidle');
    
    // Look for sessions link and click it
    const sessionsLink = page.locator('a[href*="/sessions"]').first();
    if (await sessionsLink.isVisible()) {
      await sessionsLink.click();
    } else {
      await page.goto('/sessions');
    }
    
    await page.waitForLoadState('networkidle');
    
    // Look for existing session or create new one
    let sessionLink = page.locator('a[href*="/sessions/"]').first();
    
    if (await sessionLink.count() === 0) {
      // If no sessions, create one
      const newSessionButton = page.locator('button').filter({ hasText: /新.*セッション|New.*Session|作成/ });
      if (await newSessionButton.isVisible()) {
        await newSessionButton.click();
        await page.waitForLoadState('networkidle');
      }
      
      sessionLink = page.locator('a[href*="/sessions/"]').first();
    }
    
    // Click on a session
    await sessionLink.click();
    await page.waitForLoadState('networkidle');
    
    // Look for deep research page or create one
    let deepResearchLink = page.locator('a[href*="deep-research"]').first();
    
    if (await deepResearchLink.count() === 0) {
      // Create new page with deep research
      const newPageButton = page.locator('button').filter({ hasText: /新.*ページ|New.*Page|ページ.*追加|Add.*Page/ });
      if (await newPageButton.isVisible()) {
        await newPageButton.click();
        await page.waitForLoadState('networkidle');
        
        // Select deep research option
        const deepResearchOption = page.locator('button', { hasText: /Deep.*Research|深.*研究|リサーチ/ });
        if (await deepResearchOption.isVisible()) {
          await deepResearchOption.click();
        }
        await page.waitForLoadState('networkidle');
      } else {
        // Try direct navigation to deep research page
        const currentUrl = page.url();
        const sessionId = currentUrl.match(/sessions\/([^\/]+)/)?.[1];
        if (sessionId) {
          await page.goto(`/sessions/${sessionId}/pages/test-deep-research/deep-research`);
          await page.waitForLoadState('networkidle');
        }
      }
    } else {
      await deepResearchLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot of the deep research page
    await page.screenshot({ path: 'deep-research-page.png', fullPage: true });
    
    // Check if the deep research page elements are present
    await expect(page).toHaveURL(/deep-research/);
    
    console.log('Current URL:', page.url());
  });

  test('should test deep research issue form', async ({ page }) => {
    // Navigate directly to a deep research page
    await page.goto('/sessions/test-session/pages/test-page/deep-research');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'deep-research-initial.png', fullPage: true });
    
    // Look for issue form elements
    const titleField = page.locator('input[type="text"], textarea').first();
    const descriptionField = page.locator('textarea').first();
    
    if (await titleField.isVisible()) {
      await titleField.fill('AI技術の最新動向と市場への影響について');
      
      if (await descriptionField.isVisible() && descriptionField !== titleField) {
        await descriptionField.fill('人工知能技術の急速な発展が、さまざまな業界にどのような変化をもたらしているかを調査したい。特に、GPTやLLMの普及による影響、自動化の進展、新しいビジネスモデルの創出について詳しく分析したい。');
      }
      
      // Look for submit button
      const submitButton = page.locator('button').filter({ hasText: /開始|Start|Submit|実行/ }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        
        // Wait a bit for any state changes
        await page.waitForTimeout(2000);
        
        // Take screenshot after form submission
        await page.screenshot({ path: 'deep-research-after-submit.png', fullPage: true });
      }
    }
    
    // Check for any subtasks or research progress indicators
    const subTasks = page.locator('[class*="task"], [class*="subtask"]');
    if (await subTasks.count() > 0) {
      console.log(`Found ${await subTasks.count()} subtask elements`);
    }
    
    // Check for research status indicators
    const statusIndicators = page.locator('[class*="status"], [class*="progress"]');
    if (await statusIndicators.count() > 0) {
      console.log(`Found ${await statusIndicators.count()} status indicators`);
    }
  });
});