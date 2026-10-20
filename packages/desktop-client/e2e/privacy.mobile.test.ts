import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile privacy', () => {
  let page: Page;
  let navigation: MobileNavigation;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    navigation = new MobileNavigation(page);
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  async function enablePrivacy() {
    const toggle = page.getByRole('button', {
      name: 'Enable privacy mode',
      exact: true,
    });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.locator('[data-privacy-hidden]').first()).toBeVisible();
  }

  test('masks budget, account and transaction amounts without touch-hover reveal', async () => {
    await enablePrivacy();
    await expect(
      page
        .getByTestId('budget-table-header')
        .locator('[data-privacy-hidden]')
        .first(),
    ).toBeVisible();
    const accounts = await navigation.goToAccountsPage();
    const account = await accounts.getNthAccount(0);
    const mask = account.balance.locator('[data-privacy-hidden]');
    await expect(mask).toBeVisible();
    await expect(mask.locator(':scope > div').first()).toHaveCSS(
      'opacity',
      '0',
    );
    await mask.hover();
    await expect(mask.locator(':scope > div').first()).toHaveCSS(
      'opacity',
      '0',
    );
    await expect(mask.locator(':scope > div').nth(1)).toHaveCSS(
      'font-family',
      /Redacted Script/,
    );
    await expect(
      page.getByTestId('account-balance').filter({ hasText: '328,800.00' }),
    ).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
    const ledger = await accounts.openNthAccount(2);
    await ledger.waitFor();
    await expect(
      ledger.transactions.first().locator('[data-privacy-hidden]'),
    ).toBeVisible();
  });

  test('persists the same privacy setting across mobile and desktop', async () => {
    await enablePrivacy();
    await navigation.goToAccountsPage();
    await page.reload();
    await expect(
      page
        .getByTestId('account-balance')
        .first()
        .locator('[data-privacy-hidden]'),
    ).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole('button', { name: 'Disable privacy mode', exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-privacy-hidden]')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Enable privacy mode', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
  });
});
