import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile entry', () => {
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

  for (const income of [true, false]) {
    test(`saves ${income ? 'income' : 'expenses'} with the correct sign after switching at zero`, async () => {
      const accounts = await navigation.goToAccountsPage();
      const account = await accounts.openNthAccount(2);
      const entry = await account.clickCreateTransaction();
      // Both zero-value transitions must update the sign used by the numeric keyboard.
      await page.getByRole('heading').click();
      await page.getByRole('button', { name: 'Income', exact: true }).click();
      await page.getByRole('button', { name: 'Expense', exact: true }).click();
      if (income) {
        await page.getByRole('button', { name: 'Income', exact: true }).click();
      }
      await entry.transactionForm
        .getByRole('button', { name: '0.00', exact: true })
        .click();
      await entry.fillAmount('12.34');
      await entry.createTransaction();
      await expect(account.transactions.first()).toContainText(
        income ? '12.34' : '-12.34',
      );
      if (income) {
        await expect(account.transactions.first()).not.toContainText('-12.34');
      }
    });
  }

  for (const initialAmount of [null, '8.00']) {
    test(`switches a typed amount to income after ${initialAmount ?? 'zero'} without losing the draft`, async () => {
      const accounts = await navigation.goToAccountsPage();
      const account = await accounts.openNthAccount(2);
      const entry = await account.clickCreateTransaction();
      if (initialAmount) {
        await entry.fillAmount(initialAmount);
        await entry.transactionForm
          .getByRole('button', { name: initialAmount, exact: true })
          .click();
      }
      await entry.focusAmount();
      await entry.amountField.fill('12.34');
      await page.getByRole('button', { name: 'Income', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Income', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        entry.transactionForm.getByRole('button', {
          name: '12.34',
          exact: true,
        }),
      ).toBeVisible();
      await entry.createTransaction();
      await expect(account.transactions.first()).toContainText('12.34');
      await expect(account.transactions.first()).not.toContainText('-12.34');
    });
  }

  test('keeps entered details visible while editing the amount on one page', async () => {
    const accounts = await navigation.goToAccountsPage();
    const account = await accounts.openNthAccount(2);
    const entry = await account.clickCreateTransaction();
    await entry.fillAmount('12.34');
    await entry.fillField(page.getByTestId('payee-field'), 'Kroger');
    await page.getByRole('button', { name: 'Add a note', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Notes', exact: true })
      .fill('Lunch');
    await page.getByRole('heading').click();
    await entry.fillAmount('18.50');
    await expect(page.getByTestId('payee-field')).toContainText('Kroger');
    await expect(
      page.getByRole('textbox', { name: 'Notes', exact: true }),
    ).toHaveValue('Lunch');
    await entry.createTransaction();
    await expect(account.transactions.first()).toContainText('-18.50');
    await expect(account.transactions.first()).toContainText('Lunch');
  });

  test('opens account, payee, and category pickers as dropdowns', async () => {
    const entry = await navigation.goToTransactionEntryPage();

    const dropdown = page.getByTestId('transaction-field-dropdown');
    const search = () => dropdown.getByRole('combobox').locator('input');
    const accountField = page.getByTestId('account-field');
    await entry.amountField.evaluate(element => element.blur());
    await expect(accountField).toBeEnabled();
    await accountField.click();
    const accountPicker = page.getByRole('dialog', {
      name: 'Account',
      exact: true,
    });
    await expect(accountPicker).toBeVisible();
    await expect(search()).not.toBeFocused();
    await expect(dropdown).toBeInViewport({ ratio: 0.5 });
    await expect(page.getByTestId('payee-field')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(dropdown).toMatchThemeScreenshots();
    await search().click();
    await expect(search()).toBeFocused();
    await search().fill('Bank');
    await dropdown
      .getByRole('option')
      .filter({ hasText: 'Bank of America' })
      .click();
    await expect(accountField).toContainText('Bank of America');

    await page.getByTestId('payee-field').click();
    await expect(page.getByRole('dialog', { name: 'Payee' })).toBeVisible();
    await expect(search()).not.toBeFocused();
    await search().fill('Kroger');
    await dropdown
      .getByRole('option')
      .filter({ hasText: 'Kroger' })
      .first()
      .click();
    await expect(page.getByTestId('payee-field')).toContainText('Kroger');

    await page.getByTestId('category-field').click();
    await expect(page.getByRole('dialog', { name: 'Category' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dropdown).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Transfer', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Split', exact: true }),
    ).toHaveCount(0);
  });

  test('shows the full entry form with a visible footer on small screens', async () => {
    const entry = await navigation.goToTransactionEntryPage();
    await page.getByRole('heading').click();
    const amountButton = page
      .getByTestId('transaction-amount')
      .locator('button');
    const amountDisplay = page.getByTestId('focusable-amount-display');
    const mutedAmountOpacity = await amountDisplay.evaluate(
      element => getComputedStyle(element).opacity,
    );
    await amountButton.click();
    const activeAmountOpacity = await amountDisplay.evaluate(
      element => getComputedStyle(element).opacity,
    );
    expect(activeAmountOpacity).not.toBe(mutedAmountOpacity);
    await entry.amountField.evaluate(element => element.blur());
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(
        page.getByTestId('transaction-amount-section'),
      ).toBeVisible();
      await expect(page.getByTestId('transaction-details')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Transfer', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Split', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('textbox', { name: 'Date', exact: true }),
      ).toHaveCount(1);
      await expect(
        page.getByRole('checkbox', { name: 'Cleared', exact: true }),
      ).toHaveCount(1);
      await expect(
        page.getByRole('button', { name: 'Add a note', exact: true }),
      ).toBeVisible();
      await entry.amountField.evaluate(element => element.blur());
      await expect(page.getByTestId('account-field')).toBeEnabled();
      await page.getByTestId('account-field').click();
      await page
        .getByRole('option')
        .filter({ hasText: 'Bank of America' })
        .click();
      await page.getByRole('heading').click();
      await expect(entry.footer).toBeInViewport({ ratio: 1 });
      await expect(entry.addTransactionButton).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      await expect(page).toMatchThemeScreenshots();
    }
  });
});
