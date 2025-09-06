const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to sessions page
    await page.goto('http://localhost:3000/sessions');
    await page.waitForTimeout(2000);
    
    // Find the session we created earlier
    const sessionLink = await page.locator('text=新規事業計画セッション').first();
    if (await sessionLink.isVisible()) {
      await sessionLink.click();
      await page.waitForTimeout(2000);
      
      // Click on the task management page
      const taskManagementLink = await page.locator('text=タスク管理').first();
      if (await taskManagementLink.isVisible()) {
        await taskManagementLink.click();
        await page.waitForTimeout(3000);
        
        // Take screenshot of task management page
        await page.screenshot({ path: 'task-management-page.png', fullPage: true });
        console.log('Screenshot saved: task-management-page.png');
        
        // Check if AI suggestions are loading
        const suggestionsSection = await page.locator('text=AI タスク提案').first();
        if (await suggestionsSection.isVisible()) {
          console.log('AI suggestions section is visible');
          
          // Wait for suggestions to load
          await page.waitForTimeout(5000);
          
          // Check if suggestions loaded or if there's an error
          const suggestionsLoading = await page.locator('text=提案を生成中').isVisible();
          const suggestionsEmpty = await page.locator('text=現在、提案はありません').isVisible();
          const suggestionsAvailable = await page.locator('.border-red-500, .border-yellow-500, .border-blue-500').count();
          
          if (suggestionsLoading) {
            console.log('Suggestions are still loading...');
            await page.waitForTimeout(10000);
          }
          
          if (suggestionsEmpty) {
            console.log('No suggestions available');
          } else if (suggestionsAvailable > 0) {
            console.log(`Found ${suggestionsAvailable} suggestions`);
          }
          
          // Take final screenshot
          await page.screenshot({ path: 'task-management-with-suggestions.png', fullPage: true });
          console.log('Final screenshot saved: task-management-with-suggestions.png');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }
  
  // Keep browser open for inspection
  console.log('Test complete. Press Ctrl+C to close.');
  await page.waitForTimeout(60000);
  
  await browser.close();
})();