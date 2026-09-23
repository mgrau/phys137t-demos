import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 72439;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await page.goto('/');
});

test('a stepped round counts once and locks settings until it finishes', async ({ page }) => {
  const step = page.getByRole('button', { name: 'Step', exact: true });
  await step.click();
  await expect(page.getByLabel('Coin selection')).toBeDisabled();
  await expect(page.getByTestId('trials')).toHaveText('0');
  await step.click();
  await expect(page.getByTestId('trials')).toHaveText('0');
  await step.click();
  await expect(page.getByTestId('trials')).toHaveText('1');
  await expect(page.getByLabel('Coin selection')).toBeEnabled();
  await step.click();
  await expect(page.getByTestId('trials')).toHaveText('1');
  await page.getByRole('button', { name: 'Clear this run' }).click();
  await expect(page.getByTestId('trials')).toHaveText('0');
  await expect(page.getByLabel('Coin selection')).toBeEnabled();
});

test('practice reveals a measured pair without contaminating random trials', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: '2 · Entangled qubits' }).click();
  await page.getByLabel('Coin selection').selectOption('TT');
  await page.getByLabel('Show the quantum state after the gates').check();
  await expect(page.getByRole('button', { name: '+1,000 rounds' })).toBeDisabled();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.scene [role="img"]')).toHaveAttribute('aria-label', /Measured/);
  await expect(page.locator('.scene svg')).toBeVisible();
  await expect(page.locator('.round-result')).toContainText('Practice round · not counted.');
  await expect(page.getByTestId('trials')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('quantum batches earn points without failures and keep separate model totals', async ({ page }) => {
  await page.getByRole('button', { name: '+1,000 rounds' }).click();
  await expect(page.getByTestId('trials')).toHaveText('1,000');
  expect(Number((await page.getByTestId('failures').innerText()).replaceAll(',', ''))).toBeGreaterThan(0);
  await page.getByRole('button', { name: '2 · Entangled qubits' }).click();
  await expect(page.getByTestId('trials')).toHaveText('0');
  await page.getByRole('button', { name: '+1,000 rounds' }).click();
  await expect(page.getByTestId('trials')).toHaveText('1,000');
  await expect(page.getByTestId('failures')).toHaveText('0');
  expect(Number(await page.getByTestId('points').innerText())).toBeGreaterThan(0);
  await page.getByText('The Bell bound: compare rates, not just counts', { exact: true }).click();
  await expect(page.getByTestId('difference')).toContainText('+');
  await page.getByLabel('Compare with the predicted probabilities').check();
  await expect(page.locator('.prediction-table')).toContainText('1/12');
  await page.getByRole('button', { name: '1 · Shared answer sheets' }).click();
  await expect(page.getByTestId('trials')).toHaveText('1,000');
  await page.getByRole('button', { name: 'Alice: white on heads. Change answer.' }).click();
  await expect(page.getByTestId('trials')).toHaveText('0');
  await page.getByRole('button', { name: '2 · Entangled qubits' }).click();
  await expect(page.getByTestId('trials')).toHaveText('1,000');
});

test('all local sheets can be inspected and a no-failure plan has no points', async ({ page }) => {
  await page.getByRole('button', { name: 'Inspect all 16 local answer sheets' }).click();
  await expect(page.locator('.plans-table tbody tr')).toHaveCount(16);
  await page.getByRole('button', { name: 'Try answer sheet 1', exact: true }).click();
  await page.getByRole('button', { name: '+1,000 rounds' }).click();
  await expect(page.getByTestId('points')).toHaveText('0');
  await expect(page.getByTestId('failures')).toHaveText('0');
});

test('dark mode preserves the white/black notation and survives reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const before = await page.locator('.rules svg').evaluateAll(nodes => nodes.map(n => n.outerHTML));
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('.rules svg').evaluateAll(nodes => nodes.map(n => n.outerHTML))).toEqual(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('phones show all four outcome columns without page overflow', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.results-table').evaluate(el => el.scrollWidth <= el.parentElement!.clientWidth)).toBe(true);
  }
});

test('reset cancels a running round and reduced motion completes on demand', async ({ page }) => {
  await page.clock.install();
  await page.getByRole('button', { name: 'Run one round', exact: true }).click();
  await page.getByRole('button', { name: 'Clear this run' }).click();
  await page.clock.fastForward(3000);
  await expect(page.getByTestId('trials')).toHaveText('0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Run one round', exact: true }).click();
  await expect(page.getByTestId('trials')).toHaveText('1');
  await expect(page.getByLabel('Coin selection')).toBeEnabled();
});
