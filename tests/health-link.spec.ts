import { expect, test } from '@playwright/test';

test('головна сторінка веде на /api/health', async ({ page }, testInfo) => {
  await page.goto('/');

  // Перевіряємо додане посилання
  const link = page.getByRole('link', { name: 'Стан сервісу' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/api/health');

  // Скріншот як доказ: збереження у test-results/ та вкладення до звіту
  const shot = testInfo.outputPath('home-health-link.png');
  await page.screenshot({ path: shot, fullPage: true });
  await testInfo.attach('home-health-link', { path: shot, contentType: 'image/png' });
});