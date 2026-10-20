import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile navigation', () => {
  let page: Page;
  let navigation: MobileNavigation;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage({
      viewport: { width: 350, height: 600 },
      hasTouch: true,
    });
    navigation = new MobileNavigation(page);
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('keeps primary destinations visible while scrolling', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();

    for (const name of ['Accounts', 'Add transaction']) {
      const link = navigation.navbar.getByRole('link', { name, exact: true });
      await expect(link).toBeInViewport();
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    await expect(
      navigation.navbar.getByRole('link', { name: 'Budget', exact: true }),
    ).toHaveCount(0);

    const scrollTop = await page.locator('.ptr__children').evaluate(element => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(scrollTop).toBeGreaterThan(0);
    const lastAccount = await page
      .getByTestId('account-list-item')
      .last()
      .boundingBox();
    const navbar = await navigation.navbar.boundingBox();
    expect(lastAccount).not.toBeNull();
    expect(navbar).not.toBeNull();
    if (lastAccount && navbar) {
      expect(lastAccount.y + lastAccount.height).toBeLessThanOrEqual(navbar.y);
    }
    await expect(navigation.navbar).toBeInViewport({ ratio: 1 });
    await expect(
      navigation.navbar.getByRole('link', { name: 'Accounts' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(navigation.navbar).toMatchThemeScreenshots();

    await page.setViewportSize({ width: 320, height: 568 });
    await expect(navigation.navbar).toBeInViewport({ ratio: 1 });
    await expect(
      navigation.navbar.getByRole('button', { name: 'More' }),
    ).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  });

  test('opens each primary destination on a small phone', async () => {
    await page.setViewportSize({ width: 320, height: 568 });
    await navigation.goToAccountsPage();
    await navigation.goToBudgetPage();

    for (const name of ['Previous month', 'Next month']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    const totals = page.getByTestId('budget-table-header');
    const [spent, balance] = await Promise.all(
      ['-135.00', '20,907.00'].map(value =>
        totals.getByText(value, { exact: true }).evaluate(element => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const { left, right } = range.getBoundingClientRect();
          return { left, right };
        }),
      ),
    );
    expect(spent.right + 4).toBeLessThanOrEqual(balance.left);

    await navigation.goToReportsPage();
    await expect(
      navigation.navbar.getByRole('button', { name: 'More' }),
    ).toHaveAttribute('aria-current', 'page');

    const transactionPage = await navigation.goToTransactionEntryPage();
    await expect(page).toHaveURL(/\/transactions\/new$/);
    await expect(transactionPage.transactionForm).toBeVisible();
  });

  test('opens secondary destinations with a tap and restores focus on dismissal', async () => {
    const more = navigation.navbar.getByRole('button', {
      name: 'More',
      exact: true,
    });
    await more.tap();
    const menu = page.getByRole('dialog', { name: 'More', exact: true });
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Budget', exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Reports', exact: true }),
    ).toBeVisible();
    await expect(
      navigation.navbar.getByRole('link', { name: 'Reports' }),
    ).toHaveCount(0);
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(
      menu.getByRole('button', { name: 'Schedules', exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Settings', exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Enable privacy mode', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Enable privacy mode', exact: true }),
    ).toBeVisible();
    await expect(menu).toMatchThemeScreenshots();

    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute('aria-expanded', 'false');

    await navigation.goToSchedulesPage();
    await expect(page).toHaveURL(/\/schedules$/);
    await expect(more).toHaveAttribute('aria-current', 'page');
    await navigation.goToSettingsPage();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(menu).not.toBeVisible();
    await expect(more).toHaveAttribute('aria-current', 'page');
  });
});
