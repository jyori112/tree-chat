import { test, expect } from '@playwright/test';

test.describe('Data Infrastructure Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the data test page
    await page.goto('/data-test');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="page-title"]');
  });

  test('should display the data test page correctly', async ({ page }) => {
    // Check if the page title is displayed
    await expect(page.locator('[data-testid="page-title"]')).toHaveText('Data Infrastructure Test Page');
    
    // Check if all test buttons are present
    await expect(page.locator('[data-testid="test-write-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-read-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-tree-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-default-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-batch-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="run-all-tests-button"]')).toBeVisible();
    
    // Check if input fields are present
    await expect(page.locator('[data-testid="test-path-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-value-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-tree-prefix-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-default-value-input"]')).toBeVisible();
    
    // Check if results container is present
    await expect(page.locator('[data-testid="results-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
  });

  test('should perform write operation successfully', async ({ page }) => {
    // Set test data
    await page.locator('[data-testid="test-path-input"]').fill('/test/playwright/write-test');
    await page.locator('[data-testid="test-value-input"]').fill('{"message": "Hello from Playwright!", "timestamp": "2024-01-01"}');
    
    // Click write button
    await page.locator('[data-testid="test-write-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if result appears
    await expect(page.locator('[data-testid="result-write"]')).toBeVisible();
    
    // Verify the result shows success
    const writeResult = page.locator('[data-testid="result-write"]');
    await expect(writeResult).toHaveClass(/bg-green-50/);
    
    // Check if result data is displayed
    await expect(page.locator('[data-testid="result-data"]')).toBeVisible();
  });

  test('should perform read operation successfully', async ({ page }) => {
    // First, write some data to ensure there's something to read
    await page.locator('[data-testid="test-path-input"]').fill('/test/playwright/read-test');
    await page.locator('[data-testid="test-value-input"]').fill('{"message": "Data to read", "id": "read-test-123"}');
    
    // Write data first
    await page.locator('[data-testid="test-write-button"]').click();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Now read the same data
    await page.locator('[data-testid="test-read-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if read result appears
    await expect(page.locator('[data-testid="result-read"]')).toBeVisible();
    
    // Verify the result shows success
    const readResult = page.locator('[data-testid="result-read"]');
    await expect(readResult).toHaveClass(/bg-green-50/);
    
    // Check if the read data matches what we wrote
    const resultData = page.locator('[data-testid="result-data"]').first();
    const resultText = await resultData.textContent();
    expect(resultText).toContain('"message": "Data to read"');
    expect(resultText).toContain('"id": "read-test-123"');
  });

  test('should perform readWithDefault operation successfully', async ({ page }) => {
    // Set a non-existent path and a default value
    await page.locator('[data-testid="test-default-value-input"]').fill('{"default": "This is the fallback value", "type": "default"}');
    
    // Click readWithDefault button
    await page.locator('[data-testid="test-default-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if result appears
    await expect(page.locator('[data-testid="result-read_with_default"]')).toBeVisible();
    
    // Verify the result shows success
    const defaultResult = page.locator('[data-testid="result-read_with_default"]');
    await expect(defaultResult).toHaveClass(/bg-green-50/);
    
    // Check if the default value is returned
    const resultData = page.locator('[data-testid="result-data"]').first();
    const resultText = await resultData.textContent();
    expect(resultText).toContain('"default": "This is the fallback value"');
    expect(resultText).toContain('"type": "default"');
  });

  test('should perform tree operation successfully', async ({ page }) => {
    // First, write multiple items with the same prefix
    const treePrefix = '/test/playwright/tree';
    
    // Write first item
    await page.locator('[data-testid="test-path-input"]').fill(`${treePrefix}/item1`);
    await page.locator('[data-testid="test-value-input"]').fill('{"name": "Item 1", "value": 100}');
    await page.locator('[data-testid="test-write-button"]').click();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Write second item
    await page.locator('[data-testid="test-path-input"]').fill(`${treePrefix}/item2`);
    await page.locator('[data-testid="test-value-input"]').fill('{"name": "Item 2", "value": 200}');
    await page.locator('[data-testid="test-write-button"]').click();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Write third item
    await page.locator('[data-testid="test-path-input"]').fill(`${treePrefix}/subdir/item3`);
    await page.locator('[data-testid="test-value-input"]').fill('{"name": "Item 3", "value": 300}');
    await page.locator('[data-testid="test-write-button"]').click();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Now test tree operation
    await page.locator('[data-testid="test-tree-prefix-input"]').fill(treePrefix);
    await page.locator('[data-testid="test-tree-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if tree result appears
    await expect(page.locator('[data-testid="result-read_tree"]')).toBeVisible();
    
    // Verify the result shows success
    const treeResult = page.locator('[data-testid="result-read_tree"]');
    await expect(treeResult).toHaveClass(/bg-green-50/);
    
    // Check if the tree data contains all items
    const resultData = page.locator('[data-testid="result-data"]').first();
    const resultText = await resultData.textContent();
    
    // Should contain all three items
    expect(resultText).toContain('item1');
    expect(resultText).toContain('item2'); 
    expect(resultText).toContain('item3');
    expect(resultText).toContain('"name": "Item 1"');
    expect(resultText).toContain('"name": "Item 2"');
    expect(resultText).toContain('"name": "Item 3"');
  });

  test('should perform batch operation successfully', async ({ page }) => {
    // Click batch test button
    await page.locator('[data-testid="test-batch-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if batch result appears
    await expect(page.locator('[data-testid="result-batch"]')).toBeVisible();
    
    // Verify the result shows success
    const batchResult = page.locator('[data-testid="result-batch"]');
    await expect(batchResult).toHaveClass(/bg-green-50/);
    
    // Check if the batch result contains write and read results
    const resultData = page.locator('[data-testid="result-data"]').first();
    const resultText = await resultData.textContent();
    
    // Should contain batch operation results
    expect(resultText).toContain('Batch write 1');
    expect(resultText).toContain('Batch write 2');
  });

  test('should run all tests successfully', async ({ page }) => {
    // Click run all tests button
    await page.locator('[data-testid="run-all-tests-button"]').click();
    
    // Wait for all tests to complete (this might take a while)
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 30000 });
    
    // Check that multiple results appear
    await expect(page.locator('[data-testid="result-write"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-read"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-read_tree"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-read_with_default"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-batch"]')).toBeVisible();
    
    // Verify all results show success (green background)
    const allResults = page.locator('[data-testid^="result-"]');
    const count = await allResults.count();
    
    for (let i = 0; i < count; i++) {
      const result = allResults.nth(i);
      await expect(result).toHaveClass(/bg-green-50/);
    }
    
    // Verify no results message is not visible
    await expect(page.locator('[data-testid="no-results"]')).not.toBeVisible();
  });

  test('should handle invalid JSON input gracefully', async ({ page }) => {
    // Set invalid JSON in the value field
    await page.locator('[data-testid="test-path-input"]').fill('/test/invalid-json');
    await page.locator('[data-testid="test-value-input"]').fill('invalid json {not valid}');
    
    // Click write button
    await page.locator('[data-testid="test-write-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if result appears (should still work as string)
    await expect(page.locator('[data-testid="result-write"]')).toBeVisible();
    
    // The result should be successful because invalid JSON is treated as string
    const writeResult = page.locator('[data-testid="result-write"]');
    await expect(writeResult).toHaveClass(/bg-green-50/);
  });

  test('should display error for invalid path', async ({ page }) => {
    // Set invalid path (doesn't start with /)
    await page.locator('[data-testid="test-path-input"]').fill('invalid-path-no-slash');
    await page.locator('[data-testid="test-value-input"]').fill('{"test": "data"}');
    
    // Click write button
    await page.locator('[data-testid="test-write-button"]').click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Check if result appears with error
    await expect(page.locator('[data-testid="result-write"]')).toBeVisible();
    
    // The result should show error (red background)
    const writeResult = page.locator('[data-testid="result-write"]');
    await expect(writeResult).toHaveClass(/bg-red-50/);
    
    // Check if error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});