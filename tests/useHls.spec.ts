import { test, expect } from '@playwright/test';

test.describe('useHls E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the demo page before each test
    await page.goto('/');
  });

  test('should load the page and render the video element', async ({ page }) => {
    // Check header
    await expect(page.locator('h1')).toHaveText('useHls Vue Hook');

    // Check video element visibility
    const video = page.locator('video');
    await expect(video).toBeVisible();
  });

  test('should play video and update current time', async ({ page }) => {
    const video = page.locator('video');
    
    // Play might require user interaction, let's click the video to play
    await video.click();

    // Wait for the video to start playing and time to advance
    const timeDisplay = page.locator('.time-display');
    await expect(timeDisplay).toBeVisible();

    // Let it play for a moment and verify that currentTime state in UI is > 0
    const stateCurrentTime = page.locator('.state-item:has-text("currentTime") .state-value');
    await expect(async () => {
      const timeVal = await stateCurrentTime.innerText();
      const timeNum = parseFloat(timeVal.replace('s', ''));
      expect(timeNum).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });
  });

  test('should display quality levels and allow switching', async ({ page }) => {
    // Click video to bypass autoplay restrictions and start loading manifest
    const video = page.locator('video');
    await video.click();

    // Wait for the manifest to load and quality levels to be populated
    const levelsCountState = page.locator('.state-item:has-text("Levels count") .state-value');
    await expect(async () => {
      const countVal = await levelsCountState.innerText();
      expect(parseInt(countVal)).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    // Hover over video wrapper to make controls interactive (pointer-events: auto)
    await page.locator('.video-wrapper').hover();

    // Open quality dropdown menu
    const qualityBtn = page.locator('.quality-btn');
    await expect(qualityBtn).toBeVisible();
    await qualityBtn.click();

    // Verify quality menu items exist
    const qualityMenu = page.locator('.quality-menu');
    await expect(qualityMenu).toBeVisible();

    const menuItems = page.locator('.menu-item');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(1); // Auto + at least 1 quality level

    // Click the first specific quality level (index 0)
    const firstQuality = menuItems.nth(1); // 0 is Auto, 1 is the first level
    const qualityText = await firstQuality.innerText();
    await firstQuality.click();

    // Verify that the button updates to show the selected quality label
    const selectedText = qualityText.split(' ')[0]; // E.g. "720p" from "720p (2.5 Mbps)"
    await expect(qualityBtn).toContainText(selectedText);

    // Verify state updates in the debugger
    const stateCurrentLevel = page.locator('.state-item:has-text("currentLevel") .state-value');
    await expect(stateCurrentLevel).toHaveText('Index 0');
  });

  test('should handle network offline and retry recovery', async ({ context, page }) => {
    const video = page.locator('video');
    await video.click();

    // Verify state is playing without buffering
    const isBufferingState = page.locator('.state-item:has-text("isBuffering") .state-value');
    await expect(isBufferingState).toHaveText('false');

    // Wait for video playback to actively start so metadata and duration are fully loaded
    const stateCurrentTime = page.locator('.state-item:has-text("currentTime") .state-value');
    await expect(async () => {
      const timeVal = await stateCurrentTime.innerText();
      const timeNum = parseFloat(timeVal.replace('s', ''));
      expect(timeNum).toBeGreaterThan(0.5);
    }).toPass({ timeout: 10000 });

    // Simulate network offline
    await context.setOffline(true);
    console.log('Simulating offline...');

    // Force reloading the stream while offline to trigger network error immediately
    const loadBtn = page.locator('.btn-primary');
    await loadBtn.click();

    // Wait for the error indicator in the status panel
    const errorStatus = page.locator('.error-status');
    await expect(async () => {
      const errorText = await errorStatus.innerText();
      expect(errorText).toContain('NETWORK_ERROR');
    }).toPass({ timeout: 15000 });

    // Restore network
    await context.setOffline(false);
    console.log('Network restored. Waiting for recovery...');

    // Buffer should resolve and play should resume
    await expect(isBufferingState).toHaveText('false');
  });
});
