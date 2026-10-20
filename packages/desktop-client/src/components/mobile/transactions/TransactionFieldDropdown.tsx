import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Dialog } from 'react-aria-components';
import { createPortal } from 'react-dom';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { AccountAutocomplete } from '#components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { PayeeAutocomplete } from '#components/autocomplete/PayeeAutocomplete';
import { usePrivacyMode } from '#hooks/usePrivacyMode';
import { SheetNameProvider } from '#hooks/useSheetName';

export type TransactionDropdownField =
  | 'account'
  | 'payee'
  | 'category'
  | 'transfer';

type TransactionFieldDropdownProps = {
  anchor: RefObject<HTMLButtonElement | null>;
  field: TransactionDropdownField;
  account?: string;
  hasPayee: boolean;
  date: string;
  categoryGroups: CategoryGroupEntity[];
  showHiddenCategories: boolean;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

export function TransactionFieldDropdown({
  anchor,
  field,
  account,
  hasPayee,
  date,
  categoryGroups,
  showHiddenCategories,
  onSelect,
  onClose,
}: TransactionFieldDropdownProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 12, width: 280 });
  const privacyMode = usePrivacyMode();
  const fieldTitle =
    field === 'account'
      ? t('Account')
      : field === 'payee'
        ? t('Payee')
        : field === 'category'
          ? t('Category')
          : t('Transfer');
  const autocompleteProps = {
    focused: false,
    embedded: true,
    closeOnBlur: false,
    closeOnSelect: false,
    value: null,
    onSelect,
    containerProps: { style: { height: 220 } },
    inputProps: {
      placeholder: t('Search'),
      style: { fontSize: 16, height: 48 },
    },
  };

  useLayoutEffect(() => {
    const updatePosition = () => {
      const trigger = anchor.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
      setPosition({
        top: Math.min(rect.bottom + 4, window.innerHeight - 312),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        !dropdownRef.current?.contains(event.target as Node) &&
        !anchor.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={dropdownRef}
      data-testid="transaction-field-dropdown"
      style={{
        position: 'fixed',
        zIndex: 100000,
        top: position.top,
        left: position.left,
        width: position.width,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'min(300px, calc(100dvh - 24px))',
        overflowY: 'auto',
        borderRadius: 12,
        backgroundColor: theme.menuAutoCompleteBackground,
        color: theme.menuAutoCompleteText,
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Dialog aria-label={fieldTitle} id="transaction-field-dropdown">
        <View
          style={{
            padding: 8,
            '&& input::placeholder': {
              color: theme.tableRowHeaderText,
              opacity: 1,
            },
          }}
        >
          {field === 'account' || field === 'transfer' ? (
            <AccountAutocomplete
              {...autocompleteProps}
              hiddenAccounts={field === 'transfer' && account ? [account] : []}
            />
          ) : field === 'payee' ? (
            <PayeeAutocomplete
              {...autocompleteProps}
              showManagePayees={false}
              showMakeTransfer={false}
            />
          ) : (
            <SheetNameProvider
              name={monthUtils.sheetForMonth(monthUtils.monthFromDate(date))}
            >
              <CategoryAutocomplete
                {...autocompleteProps}
                categoryGroups={categoryGroups}
                showHiddenCategories={showHiddenCategories}
                showSplitOption={false}
                showBalances={!privacyMode}
              />
            </SheetNameProvider>
          )}
          {(field === 'category' || (field === 'payee' && hasPayee)) && (
            <Button
              variant="menu"
              style={{ minHeight: 44 }}
              onPress={() => onSelect(null)}
            >
              {field === 'category' ? (
                <Trans>Uncategorized</Trans>
              ) : (
                <Trans>No payee</Trans>
              )}
            </Button>
          )}
        </View>
      </Dialog>
    </div>,
    document.body,
  );
}
