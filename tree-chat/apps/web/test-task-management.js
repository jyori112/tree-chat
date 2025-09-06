import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to the main page
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(2000);
  
  // Take screenshot of main page
  await page.screenshot({ path: 'screenshots/01-main-page.png', fullPage: true });
  
  // Create a new session
  await page.fill('input[placeholder="セッション名"]', 'Task Management Test');
  await page.click('button:has-text("新規作成")');
  await page.waitForTimeout(2000);
  
  // Take screenshot of session page
  await page.screenshot({ path: 'screenshots/02-session-created.png', fullPage: true });
  
  // Click on the first page link
  const pageLink = await page.locator('a:has-text("Page 1")').first();
  await pageLink.click();
  await page.waitForTimeout(2000);
  
  // Take screenshot of page
  await page.screenshot({ path: 'screenshots/03-page-view.png', fullPage: true });
  
  // Create a new page
  await page.click('button:has-text("ページを追加")');
  await page.waitForTimeout(1000);
  
  // Select task management template
  await page.click('button:has-text("タスク管理")');
  await page.waitForTimeout(3000);
  
  // Take screenshot of task management page
  await page.screenshot({ path: 'screenshots/04-task-management-page.png', fullPage: true });
  
  // Create a new task
  await page.click('button:has-text("新規タスク")');
  await page.waitForTimeout(500);
  
  await page.fill('input[placeholder="タスク名"]', 'メインタスク');
  await page.fill('textarea[placeholder="やるべきこと・答えを出さなければいけない問い"]', 'プロジェクトの全体設計を完成させる');
  await page.click('button:has-text("作成")');
  await page.waitForTimeout(1000);
  
  // Take screenshot after creating task
  await page.screenshot({ path: 'screenshots/05-task-created.png', fullPage: true });
  
  // Add a subtask
  await page.click('button:has-text("サブタスク追加")');
  await page.waitForTimeout(500);
  
  await page.fill('input[placeholder="サブタスク名"]', 'データベース設計');
  await page.fill('textarea[placeholder="やるべきこと・問い"]', 'ERDを作成してテーブル構造を定義する');
  await page.click('button:has-text("追加")');
  await page.waitForTimeout(1000);
  
  // Take screenshot with subtask
  await page.screenshot({ path: 'screenshots/06-subtask-added.png', fullPage: true });
  
  // Change task status
  const statusDropdown = await page.locator('select').first();
  await statusDropdown.selectOption('in_progress');
  await page.waitForTimeout(500);
  
  // Take screenshot with updated status
  await page.screenshot({ path: 'screenshots/07-status-updated.png', fullPage: true });
  
  // Edit task result
  await page.click('div:has-text("クリックして結果を追加")').first();
  await page.fill('textarea', 'データベース設計書を作成完了。5つのテーブルを定義。');
  await page.click('button[class*="text-green"]');
  await page.waitForTimeout(500);
  
  // Take screenshot with result
  await page.screenshot({ path: 'screenshots/08-result-added.png', fullPage: true });
  
  // Test filtering
  await page.selectOption('select[class*="border-gray-300"]', 'in_progress');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/09-filtered-view.png', fullPage: true });
  
  // Open hamburger menu
  await page.click('button[title="メニュー"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/10-menu-open.png', fullPage: true });
  
  console.log('✅ All tests completed successfully!');
  console.log('Screenshots saved in screenshots/ directory');
  
  await browser.close();
})();