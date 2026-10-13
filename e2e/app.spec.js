const { test, expect } = require('@playwright/test');

// On phones the form is folded behind "Your details"; open it before typing.
async function openForm(page) {
  const toggle = page.locator('#railToggle');
  if (await toggle.isVisible() && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
}

const outlook = (page) => page.locator('#board .outlook').first();

test('an adult sees a plan, and it follows the inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#outlook-h')).toHaveText('Your outlook');
  await expect(outlook(page)).toContainText('Daily intake');
  const before = await outlook(page).innerText();

  await openForm(page);
  await page.locator('#weight').fill('110');
  await expect(page.locator('#railSummary')).toContainText('110');
  await expect.poll(() => outlook(page).innerText()).not.toBe(before);
});

test('a child gets a growth chart, not a calorie deficit', async ({ page }) => {
  await page.goto('/');
  await openForm(page);
  await page.locator('#ageYears').fill('10');
  await expect(page.locator('#outlook-h')).toHaveText('Growth chart · CDC BMI-for-age');
  await expect(page.locator('#board')).toContainText('percentile');
  await expect(page.locator('#board')).not.toContainText('Starting deficit');
});

test('language and units switch and are remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'PL' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.locator('#outlook-h')).toHaveText('Twoja prognoza');
  await page.getByRole('radio', { name: 'lb · in' }).click();
  await expect(page.locator('#railSummary')).toContainText('lb');

  await page.reload();
  await expect(page.locator('#outlook-h')).toHaveText('Twoja prognoza');
  await expect(page.locator('#railSummary')).toContainText('lb');
});

test('the intake explanation follows the selected weight units', async ({ page }) => {
  await page.goto('/');
  const intakeHint = page.locator('.outlook__label .hint').first();
  await expect(intakeHint).toHaveAttribute('data-tip', /7,700 kcal-per-kilogram rule/);
  await page.getByRole('radio', { name: 'lb · in' }).click();
  await expect(intakeHint).toHaveAttribute('data-tip', /3,500 kcal-per-pound rule/);
  await page.getByRole('radio', { name: 'kg · cm' }).click();
  await expect(intakeHint).toHaveAttribute('data-tip', /7,700 kcal-per-kilogram rule/);
});

test('the opened mobile form lets the page scroll to its lower controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await openForm(page);
  const form = await page.locator('#form').boundingBox();
  await page.mouse.move(form.x + form.width / 2, form.y + 200);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.site-footer')).toBeInViewport();
});

test('a shared link opens the same profile in a fresh browser', async ({ page, browser }, testInfo) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await openForm(page);
  await page.locator('#weight').fill('91');
  await expect(page.locator('#railSummary')).toContainText('91');
  await page.locator('#shareBtn').click();
  await expect(page.locator('#shareBtn')).toContainText('Link copied!');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/^http:\/\/localhost:8770\/#.*weightKg=91/);

  const fresh = await browser.newContext(testInfo.project.use);
  const other = await fresh.newPage();
  await other.goto(link);
  await expect(other.locator('#railSummary')).toContainText('91');
  // The profile is read once, then the address bar is cleared.
  await expect.poll(() => other.url()).toBe('http://localhost:8770/');
  await fresh.close();
});

test('a link with inputs after "?" is ignored, not read', async ({ page, browser }, testInfo) => {
  const fresh = await browser.newContext(testInfo.project.use);
  const other = await fresh.newPage();
  await other.goto('/?weightKg=91&heightCm=170&ageYears=40');
  await other.locator('#railSummary').waitFor({ state: 'attached' });
  await expect(other.locator('#railSummary')).not.toContainText('91');
  await expect.poll(() => other.url()).toBe('http://localhost:8770/');
  await fresh.close();
});

test('the installed app opens offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#outlook-h')).toHaveText('Your outlook');
  await expect(outlook(page)).toContainText('Daily intake');
  await context.setOffline(false);
});

test('the footer credits Kuba, headers are strict and no page logs errors', async ({ page }) => {
  const outside = [];
  const errors = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://localhost:8770')) outside.push(request.url());
  });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto('/');
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const credit = page.locator('.footer-credit');
  await expect(credit).toHaveText('WeightFrame v1.02 by Kuba · tinkered.app · Privacy');
  await expect(credit.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', 'privacy.html');
  await expect(credit.getByRole('link', { name: 'Kuba' })).toHaveAttribute('href', 'mailto:kuba@tinkered.app');
  await expect(credit.getByRole('link', { name: 'tinkered.app' })).toHaveAttribute('href', 'https://tinkered.app');

  await page.getByRole('tab', { name: 'Methods' }).click();
  await expect(page.locator('#panel-methods')).toBeVisible();
  await expect(page.locator('#panel-methods')).toContainText('WeightFrame gives population-based estimates for education, not medical advice or a diagnosis.');
  await page.getByRole('tab', { name: /Sources/ }).click();
  await expect(page.locator('#panel-sources')).toBeVisible();

  // Requests to other origins are a warning, not a failure: avoiding them is a goal, not a hard limit.
  for (const url of outside) {
    test.info().annotations.push({ type: 'warning', description: `third-party request: ${url}` });
    console.warn(`warning: third-party request: ${url}`);
  }
  expect(errors).toEqual([]);
});

test('the footer links to a privacy page that search engines skip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'PL' }).click();
  await openForm(page);
  await page.getByRole('link', { name: 'Prywatność' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dane i prywatność');

  await page.getByRole('radio', { name: 'EN' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Data and privacy');
  await page.getByRole('link', { name: 'Methods' }).click();
  await expect(page.locator('#tab-methods')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the privacy page is sent with a noindex header', async ({ request }) => {
  const res = await request.get('/privacy');
  expect(res.headers()['x-robots-tag']).toBe('noindex');
});
