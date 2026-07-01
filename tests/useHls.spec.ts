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

    // Wait for playback to actively start (ensures manifest is parsed and levels populated)
    const stateCurrentTime = page.locator('.state-item:has-text("currentTime") .state-value');
    await expect(async () => {
      const timeVal = await stateCurrentTime.innerText();
      const timeNum = parseFloat(timeVal.replace('s', ''));
      expect(timeNum).toBeGreaterThan(0.5);
    }).toPass({ timeout: 15000 });

    // Verify quality levels exist in state (with async retry to allow Vue DOM to sync)
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

  test('should handle network errors and recover', async ({ page }) => {
    const video = page.locator('video');
    await video.click();

    // Verify state is playing without buffering initially
    const isBufferingState = page.locator('.state-item:has-text("isBuffering") .state-value');
    await expect(isBufferingState).toHaveText('false');

    // Enter invalid stream URL to trigger network load error instantly
    const urlInput = page.locator('#hls-url');
    await urlInput.fill('https://invalid-stream-url-for-test-xyz.m3u8');

    const loadBtn = page.locator('.btn-primary');
    await loadBtn.click();

    // Wait for the NETWORK_ERROR indicator in the status panel
    const errorStatus = page.locator('.error-status');
    await expect(async () => {
      const errorText = await errorStatus.innerText();
      expect(errorText.toLowerCase()).toContain('networkerror');
    }).toPass({ timeout: 10000 });

    // Recover by clicking Reset to load default stream URL again
    const resetBtn = page.locator('.btn-secondary');
    await resetBtn.click();
    await loadBtn.click();

    // Click video again to play if needed
    await video.click();

    // Verify that the error is cleared and video starts playing again
    await expect(errorStatus).toContainText('Ошибок нет. Все работает отлично.');
    const stateCurrentTime = page.locator('.state-item:has-text("currentTime") .state-value');
    await expect(async () => {
      const timeVal = await stateCurrentTime.innerText();
      const timeNum = parseFloat(timeVal.replace('s', ''));
      expect(timeNum).toBeGreaterThan(0.5);
    }).toPass({ timeout: 15000 });
  });
});
