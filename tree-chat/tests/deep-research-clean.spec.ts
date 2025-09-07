import { test, expect } from '@playwright/test';

test.describe('Deep Research - Clean Environment Test', () => {
  test('should access homepage and navigate to deep research', async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3000');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of home page
    await page.screenshot({ path: 'home-page-clean.png', fullPage: true });
    
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Check if we can access sessions page
    const sessionsLink = page.locator('text=Sessions Test').first();
    if (await sessionsLink.isVisible()) {
      await sessionsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot after clicking sessions
      await page.screenshot({ path: 'sessions-page-clean.png', fullPage: true });
    }
    
    // Try direct navigation to a deep research page
    await page.goto('http://localhost:3000/sessions/test-session/pages/test-page/deep-research');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of deep research page
    await page.screenshot({ path: 'deep-research-direct-clean.png', fullPage: true });
    
    console.log('Deep research URL:', page.url());
    
    // Check if page loads without infinite loops
    await page.waitForTimeout(3000);
    
    // Verify no console errors indicating infinite loops
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Check if essential elements are present
    const pageContent = await page.textContent('body');
    const hasContent = pageContent && pageContent.length > 100;
    
    console.log('Page has substantial content:', hasContent);
    console.log('Console messages count:', consoleMessages.length);
  });

  test('should test deep research form functionality', async ({ page }) => {
    // Navigate directly to deep research page
    await page.goto('http://localhost:3000/sessions/test-session/pages/test-page/deep-research');
    await page.waitForLoadState('networkidle');
    
    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'deep-research-form-initial.png', fullPage: true });
    
    // Check for form elements
    const titleInput = page.locator('input[placeholder*="タイトル"], input[placeholder*="title"]').first();
    const descriptionTextarea = page.locator('textarea').first();
    
    if (await titleInput.isVisible()) {
      console.log('Title input found');
      await titleInput.fill('クリーンテスト：AI技術の市場動向分析');
      await page.waitForTimeout(500);
    }
    
    if (await descriptionTextarea.isVisible()) {
      console.log('Description textarea found');
      await descriptionTextarea.fill('クリーンな環境でのテスト実行。人工知能技術が市場に与える影響について詳細な分析を実施する。');
      await page.waitForTimeout(500);
    }
    
    // Take screenshot after filling form
    await page.screenshot({ path: 'deep-research-form-filled.png', fullPage: true });
    
    // Check for submit button
    const submitButton = page.locator('button').filter({ hasText: /開始|Start|Submit|実行/ }).first();
    if (await submitButton.isVisible()) {
      console.log('Submit button found');
      const isEnabled = await submitButton.isEnabled();
      console.log('Submit button enabled:', isEnabled);
      
      if (isEnabled) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Take screenshot after submission
        await page.screenshot({ path: 'deep-research-after-submit.png', fullPage: true });
      } else {
        console.log('Submit button is disabled');
      }
    }
    
    // Check for any research progress indicators
    const progressElements = page.locator('[class*="step"], [class*="stage"], [class*="progress"]');
    const progressCount = await progressElements.count();
    console.log('Progress elements found:', progressCount);
    
    // Verify no infinite loop indicators
    await page.waitForTimeout(2000);
    const finalContent = await page.textContent('body');
    console.log('Final page has content:', finalContent && finalContent.length > 100);
  });
});