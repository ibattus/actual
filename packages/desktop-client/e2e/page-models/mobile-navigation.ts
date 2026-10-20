import type { Locator, Page } from '@playwright/test';

import { MobileAccountPage } from './mobile-account-page';
import { MobileAccountsPage } from './mobile-accounts-page';
import { MobileBankSyncPage } from './mobile-bank-sync-page';
import { MobileBudgetPage } from './mobile-budget-page';
import { MobilePayeesPage } from './mobile-payees-page';
import { MobileReportsPage } from './mobile-reports-page';
import { MobileRulesPage } from './mobile-rules-page';
import { MobileSchedulesPage } from './mobile-schedules-page';
import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';
import { SettingsPage } from './settings-page';

const SECONDARY_PAGES = ['Budget', 'Reports', 'Schedules', 'Settings'];
const ROUTES_BY_PAGE = {
  Budget: '/budget',
  Accounts: '/accounts',
  Transaction: '/transactions/new',
  Reports: '/reports',
  Schedules: '/schedules',
  Settings: '/settings',
};

export class MobileNavigation {
  readonly page: Page;
  readonly heading: Locator;
  readonly navbar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading');
    this.navbar = page.getByRole('navigation', { name: 'Main navigation' });
  }

  async navigateToPage<T extends { waitFor: Locator['waitFor'] }>(
    pageName: keyof typeof ROUTES_BY_PAGE,
    pageModelFactory: () => T,
  ): Promise<T> {
    const pageInstance = pageModelFactory();

    if (this.page.url().endsWith(ROUTES_BY_PAGE[pageName])) {
      // Already on the page.
      return pageInstance;
    }

    await this.navbar.waitFor();

    if (SECONDARY_PAGES.includes(pageName)) {
      await this.navbar
        .getByRole('button', { name: 'More', exact: true })
        .click();
      await this.page
        .getByRole('dialog', { name: 'More', exact: true })
        .getByRole('button', { name: pageName, exact: true })
        .click();
    } else {
      await this.navbar
        .getByRole('link', {
          name: pageName === 'Transaction' ? 'Add transaction' : pageName,
          exact: true,
        })
        .click();
    }

    await pageInstance.waitFor();

    return pageInstance;
  }

  async goToBudgetPage() {
    return await this.navigateToPage(
      'Budget',
      () => new MobileBudgetPage(this.page),
    );
  }

  async goToAccountsPage() {
    return await this.navigateToPage(
      'Accounts',
      () => new MobileAccountsPage(this.page),
    );
  }

  async goToUncategorizedPage() {
    const button = this.page.getByRole('button', { name: 'Categorize' });
    await button.click();

    return new MobileAccountPage(this.page);
  }

  async goToTransactionEntryPage() {
    return await this.navigateToPage(
      'Transaction',
      () => new MobileTransactionEntryPage(this.page),
    );
  }

  async goToReportsPage() {
    return await this.navigateToPage(
      'Reports',
      () => new MobileReportsPage(this.page),
    );
  }

  async goToPayeesPage() {
    const settingsPage = await this.goToSettingsPage();
    await settingsPage.goToSection('Payees');

    const payeesPage = new MobilePayeesPage(this.page);
    await payeesPage.waitFor();
    return payeesPage;
  }

  async goToSchedulesPage() {
    return this.navigateToPage(
      'Schedules',
      () => new MobileSchedulesPage(this.page),
    );
  }

  async goToRulesPage() {
    const settingsPage = await this.goToSettingsPage();
    await settingsPage.goToSection('Rules');

    const rulesPage = new MobileRulesPage(this.page);
    await rulesPage.waitFor();
    return rulesPage;
  }

  async goToBankSyncPage() {
    const settingsPage = await this.goToSettingsPage();
    await settingsPage.goToSection('Bank Sync');

    const bankSyncPage = new MobileBankSyncPage(this.page);
    await bankSyncPage.waitFor();
    return bankSyncPage;
  }

  async goToSettingsPage() {
    return await this.navigateToPage(
      'Settings',
      () => new SettingsPage(this.page),
    );
  }
}
