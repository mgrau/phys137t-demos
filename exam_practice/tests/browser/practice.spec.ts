import { test, expect, type Page } from '@playwright/test';

async function question(page: Page, id: string) {
  await page.goto(`/?q=${id}`);
  await expect(page.getByRole('button', { name: 'Check answer', exact: true })).toBeVisible();
}
test('retry threshold, deliberate checking, duplicates, solutions and saved progress', async ({ page }) => {
  await question(page, 'traffic');
  const check = page.getByRole('button', { name: 'Check answer', exact: true });
  await check.click(); await expect(page.getByRole('status')).toContainText('Finish your answer');
  await expect(page.getByRole('button', { name: 'Show solution' })).toHaveCount(0);
  await page.getByRole('textbox').fill('1');
  await expect(page.getByRole('status')).not.toContainText('Try again');
  await check.click(); await check.click();
  await expect(page.getByRole('status')).toContainText('already checked');
  await expect(page.locator('.panel-eyebrow').last()).toContainText('1 incorrect attempt');
  for (const value of ['3','4']) { await page.getByRole('textbox').fill(value); await check.click(); }
  await page.getByRole('button', { name: 'Show solution' }).click();
  await expect(page.getByRole('heading', { name: 'Distinguish all three colors' })).toBeVisible();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByRole('heading', { name: 'Add a second bit' })).toBeVisible();
  await page.getByRole('button', { name: 'Your answer', exact: true }).click();
  await page.getByRole('textbox').fill('2'); await check.click();
  await expect(page.getByRole('status')).toContainText('Solved with help');
  await page.reload(); await expect(page.getByRole('button', { name: 'Show solution' })).toBeVisible();
});
test('state drawing supports signed terms and accepts equivalent typed factoring', async ({ page }) => {
  await question(page, 'h-black');
  await page.getByRole('button', { name: 'Possibility 1, circle: blank', exact: true }).click();
  await page.getByRole('button', { name: '+ Possibility', exact: true }).click();
  await page.getByRole('button', { name: 'Possibility 2, circle: blank', exact: true }).click();
  await page.getByRole('button', { name: 'Possibility 2, circle: white', exact: true }).click();
  await page.getByRole('button', { name: 'Sign of possibility 2' }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
  await question(page, 'conditional-black');
  await page.getByRole('button', { name: 'Type a state instead' }).click();
  await page.getByRole('textbox', { name: 'State notation' }).fill('(-0|1)1');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
});
test('builds an alternative entangling circuit with accessible controls', async ({ page }) => {
  await question(page, 'bell-prepare');
  await page.getByLabel('Gate wire or control').selectOption('2');
  await page.getByRole('button', { name: 'Add gate', exact: true }).click();
  await page.getByRole('button', { name: 'CNOT', exact: true }).click();
  await page.getByLabel('Gate target or second control').selectOption('1');
  await page.getByRole('button', { name: 'Add gate', exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
});
test('dragging a first gate onto the square uses the correct wire', async ({ page }) => {
  await question(page, 'bell-prepare');
  const palette = (await page.getByRole('button', { name: 'H', exact: true }).boundingBox())!;
  const drawing = (await page.locator('.circuit-board svg').boundingBox())!;
  await page.mouse.move(palette.x + palette.width / 2, palette.y + palette.height / 2);
  await page.mouse.down();
  await page.mouse.move(drawing.x + drawing.width * .75, drawing.y + drawing.height * .6, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('.circuit-editor .editor-actions')).toContainText('1 / 8 gates');
  await page.getByRole('button', { name: 'CNOT', exact: true }).click();
  await page.getByLabel('Gate wire or control').selectOption('2');
  await page.getByLabel('Gate target or second control').selectOption('1');
  await page.getByRole('button', { name: 'Add gate', exact: true }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
});
test('week filters, back navigation, direct links and threshold are consistent', async ({ page }) => {
  await page.goto('/?week=1.5&attempts=1.6');
  await expect(page.getByLabel('Practice category')).toHaveValue('0');
  await expect(page.getByLabel('Incorrect attempts before solution')).toHaveValue('2');
  await page.getByLabel('Practice category').selectOption('4');
  const titles = await page.getByLabel('Choose question').locator('option').allTextContents();
  const visited = new Set<string>();
  for (let i = 0; i < titles.length; i++) {
    visited.add(await page.getByLabel('Choose question').inputValue());
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  expect(visited.size).toBe(titles.length);
  await page.goto('/?week=1&q=bell-prepare');
  await expect(page.getByLabel('Practice category')).toHaveValue('1');
  expect(await page.getByLabel('Choose question').inputValue()).not.toBe('');
  await page.getByLabel('Choose question').selectOption('traffic');
  await page.getByLabel('Incorrect attempts before solution').selectOption('1');
  await page.getByRole('textbox').fill('1');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show solution' })).toBeVisible();
});
test('numeric formats and select-all concepts work', async ({ page }) => {
  await question(page, 'partial');
  await page.getByRole('textbox', { name: 'White square' }).fill('2/3');
  await page.getByRole('textbox', { name: 'Black square' }).fill('33.33%');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
  await question(page, 'bell-meaning');
  await page.getByRole('button', { name: /Correlation in a single setting/ }).click();
  await page.getByRole('button', { name: /Bell tests compare/ }).click();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
});
test('truth-table shapes keep input and output order', async ({ page }) => {
  await question(page, 'cnot-table');
  const inputs = ['00','01','10','11']; const outputs = ['00','11','10','01'];
  for (let i = 0; i < 4; i++) for (let wire = 0; wire < 2; wire++) {
    const label = `Input ${inputs[i]}, output ${wire === 0 ? 'circle' : 'square'}`;
    await page.getByRole('button', { name: `${label}: blank`, exact: true }).click();
    if (outputs[i][wire] === '1') await page.getByRole('button', { name: `${label}: white`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct');
});
for (const [width,height] of [[1366,768],[1024,600],[800,500],[390,844],[375,667]]) {
  test(`all questions fit ${width}×${height} with reachable controls`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?q=labels');
    const ids = await page.getByLabel('Choose question').locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value));
    for (const id of ids) {
      await page.getByLabel('Choose question').selectOption(id);
      if (width <= 700) await page.getByRole('button', { name: 'Work on your answer' }).click();
      await expect(page.getByRole('button', { name: 'Check answer', exact: true })).toBeInViewport();
      // overflow:clip alone can hide mistakes. Check the actual scaled content
      // against its available panel, not just the page's scroll dimensions.
      await expect.poll(() => page.locator('.panel:not(.mobile-hidden), .panel').evaluateAll(panels => {
        return panels.filter(panel => (panel as HTMLElement).offsetParent !== null).flatMap(panel => [...panel.querySelectorAll('.fit')]).filter(fit => (fit as HTMLElement).offsetHeight > 0).every(fit => {
          const outer = fit.getBoundingClientRect();
          const inner = fit.firstElementChild!.getBoundingClientRect();
          return inner.bottom <= outer.bottom + 1 && inner.right <= outer.right + 1 && inner.left >= outer.left - 1;
        });
      })).toBe(true);
      const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, vw: innerWidth, vh: innerHeight }));
      expect(size.w).toBeLessThanOrEqual(size.vw); expect(size.h).toBeLessThanOrEqual(size.vh);
    }
    expect(errors).toEqual([]);
  });
}
test('runs in an iframe with browser storage blocked', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  await page.goto('/');
  await page.setContent('<iframe title="Practice" src="/?q=traffic" style="width:900px;height:620px"></iframe>');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('textbox').fill('2');
  await frame.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(frame.getByRole('status')).toContainText('Correct');
  await expect(frame.locator('.footer')).toContainText('this session');
});
