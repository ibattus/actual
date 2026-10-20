import React from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';

import { useAccounts } from '#hooks/useAccounts';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function DefaultTransactionAccount() {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [defaultAccount = '', setDefaultAccount] = useSyncedPref(
    'defaultTransactionAccount',
  );

  return (
    <SettingsGroup title={t('Transactions')}>
      <SettingsRow
        title={t('Default account')}
        description={t(
          'Choose the account preselected when you add a transaction.',
        )}
        control={
          <Select
            value={defaultAccount}
            onChange={setDefaultAccount}
            options={[
              ['', t('Use last used account')],
              ...accounts.map(account => [account.id, account.name] as const),
            ]}
          />
        }
      />
    </SettingsGroup>
  );
}
