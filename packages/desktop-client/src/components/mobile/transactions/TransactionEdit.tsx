import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode, RefObject } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgSplit } from '@actual-app/components/icons/v0';
import {
  SvgAdd,
  SvgCalendar,
  SvgCheveronDown,
  SvgLocation,
  SvgPiggyBank,
  SvgTag,
  SvgTrash,
  SvgUser,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import {
  SvgNotesPaper,
  SvgPencilWriteAlternate,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { DEFAULT_MAX_DISTANCE_METERS } from '@actual-app/core/shared/constants';
import { calculateDistance } from '@actual-app/core/shared/location-utils';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { DEFAULT_UPCOMING_SCHEDULE_DAYS } from '@actual-app/core/shared/schedules';
import {
  addSplitTransaction,
  deleteTransaction,
  makeEmptySplitSubtransactions,
  realizeTempTransactions,
  splitTransaction,
  ungroupTransactions,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import {
  amountToInteger,
  applyFindReplace,
  diffItems,
  getChangedValues,
  groupById,
  integerToAmount,
  integerToCurrency,
  titleFirst,
} from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { css, keyframes } from '@emotion/css';
import {
  format as formatDate,
  isValid as isValidDate,
  parse as parseDate,
  parseISO,
} from 'date-fns';

import { NoteInsertHashButton } from '#components/autocomplete/NoteInsertHashButton';
import { NoteTagAutocomplete } from '#components/autocomplete/NoteTagAutocomplete';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import {
  FieldLabel,
  InputField,
  TapField,
} from '#components/mobile/MobileForms';
import { getPrettyPayee } from '#components/mobile/utils';
import { MobilePageHeader, Page } from '#components/Page';
import { PrivacyFilter } from '#components/PrivacyFilter';
import {
  propagateRuleChangeToSubtransactions,
  transactionForRulesFromList,
} from '#components/transactions/applyRulesToTransaction';
import {
  getClearedFieldNames,
  shouldApplyRuleChange,
  trackClearedField,
} from '#components/transactions/table/utils';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLocalPref } from '#hooks/useLocalPref';
import { useLocationPermission } from '#hooks/useLocationPermission';
import { useNavigate } from '#hooks/useNavigate';
import { useNearbyPayees } from '#hooks/useNearbyPayees';
import { usePayees } from '#hooks/usePayees';
import {
  SingleActiveEditFormProvider,
  useSingleActiveEditForm,
} from '#hooks/useSingleActiveEditForm';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useSavePayeeLocationMutation } from '#payees';
import { locationService } from '#payees/location';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch, useSelector } from '#redux';
import { setLastTransaction } from '#transactions/transactionsSlice';
import { getStatusLabel } from '#util/schedule';
import {
  calculateFutureTransactionInfo,
  createSingleTimeScheduleFromTransaction,
  isFutureTransaction,
} from '#util/schedule-actions';

import { SplitAmountInput } from './SplitAmountInput';
import { TransactionAmountSection } from './TransactionAmountSection';
import { TransactionEntryField } from './TransactionEntryField';
import { TransactionFieldDropdown } from './TransactionFieldDropdown';
import type { TransactionDropdownField } from './TransactionFieldDropdown';

const mobileTransactionEntrySlideIn = keyframes({
  from: { transform: 'translateY(100%)' },
  to: { transform: 'translateY(0)' },
});
const mobileTransactionEntryClassName = css({
  animation: `${mobileTransactionEntrySlideIn} 240ms cubic-bezier(0.22, 1, 0.36, 1)`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

function getFieldName(transactionId: TransactionEntity['id'], field: string) {
  return `${field}-${transactionId}`;
}

function serializeTransaction(
  transaction: TransactionEntity,
  dateFormat: string,
) {
  const { date, amount } = transaction;
  return {
    ...transaction,
    date: formatDate(parseISO(date), dateFormat),
    amount: integerToAmount(amount || 0),
  };
}

function deserializeTransaction(
  transaction: TransactionEntity,
  originalTransaction: TransactionEntity | null,
  dateFormat: string,
) {
  const { amount, date: originalDate, ...realTransaction } = transaction;

  const dayMonth = monthUtils.getDayMonthRegex(dateFormat);
  let date: string | null = originalDate;
  if (dayMonth.test(date)) {
    const test = parseDate(
      date,
      monthUtils.getDayMonthFormat(dateFormat),
      new Date(),
    );
    if (isValidDate(test)) {
      date = monthUtils.dayFromDate(test);
    } else {
      date = null;
    }
  } else {
    const test = parseDate(date, dateFormat, new Date());
    // This is a quick sanity check to make sure something invalid
    // like "year 201" was entered
    if (test.getFullYear() > 2000 && isValidDate(test)) {
      date = monthUtils.dayFromDate(test);
    } else {
      date = null;
    }
  }

  if (date == null) {
    date =
      (originalTransaction && originalTransaction.date) ||
      monthUtils.currentDay();
  }

  return { ...realTransaction, date, amount: amountToInteger(amount || 0) };
}

export function lookupName(items: CategoryEntity[], id?: CategoryEntity['id']) {
  if (!id) {
    return null;
  }
  return items.find(item => item.id === id)?.name;
}

const dropdownChevron = (
  <SvgCheveronDown
    width={14}
    height={14}
    style={{ color: theme.pageTextSubdued, marginRight: 8 }}
  />
);

export function Status({
  status,
  isSplit = false,
}: {
  status?: string;
  isSplit?: boolean;
}) {
  const { t } = useTranslation();

  let color: string | undefined;

  switch (status) {
    case 'missed':
      color = theme.errorText;
      break;
    case 'due':
      color = theme.warningText;
      break;
    case 'upcoming':
      color = theme.tableHeaderText;
      break;
    default:
      return null;
  }

  return (
    <Text
      style={{
        fontSize: 11,
        color,
        fontStyle: 'italic',
        textAlign: 'left',
      }}
    >
      {isSplit
        ? t('{{status}} (Split)', {
            status: titleFirst(getStatusLabel(status)),
          })
        : titleFirst(getStatusLabel(status))}
    </Text>
  );
}

type FooterProps = {
  transactions: TransactionEntity[];
  isAdding: boolean;
  onAdd: () => void;
  onSave: () => void;
  onSchedule: () => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  onEmptySplitFound: (id: TransactionEntity['id']) => void;
  editingField?: string;
  isFuture: boolean;
  onEditField: (
    id: TransactionEntity['id'],
    field: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
    anchor?: Element,
  ) => void;
};

function Footer({
  transactions,
  isAdding,
  onAdd,
  onSave,
  onSchedule,
  onSplit,
  onAddSplit,
  onEmptySplitFound,
  editingField,
  onEditField,
  isFuture,
}: FooterProps) {
  const [transaction, ...childTransactions] = transactions;
  const emptySplitTransaction = childTransactions.find(t => t.amount === 0);
  const onClickRemainingSplit = () => {
    if (childTransactions.length === 0) {
      onSplit(transaction.id);
    } else {
      if (!emptySplitTransaction) {
        onAddSplit(transaction.id);
      } else {
        onEmptySplitFound?.(emptySplitTransaction.id);
      }
    }
  };

  return (
    <View
      data-testid="transaction-form-footer"
      style={{
        paddingLeft: styles.mobileEditingPadding,
        paddingRight: styles.mobileEditingPadding,
        paddingTop: 12,
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: theme.mobilePageBackground,
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
        gap: 8,
      }}
    >
      {isFuture && (
        <Button
          variant="normal"
          style={{ height: 52, borderRadius: 14, fontSize: 16 }}
          isDisabled={!!editingField}
          onPress={onSchedule}
        >
          <SvgCalendar width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Schedule</Trans>
          </Text>
        </Button>
      )}
      {transaction.error?.type === 'SplitTransactionError' ? (
        <Button
          variant="primary"
          style={{ height: 52, borderRadius: 14, fontSize: 16 }}
          isDisabled={!!editingField}
          onPress={onClickRemainingSplit}
        >
          <SvgSplit width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            {!emptySplitTransaction ? (
              <Trans>
                Add new split -{' '}
                {{
                  amount: integerToCurrency(
                    transaction.amount > 0
                      ? transaction.error.difference
                      : -transaction.error.difference,
                  ),
                }}{' '}
                left
              </Trans>
            ) : (
              <Trans>
                Amount left:{' '}
                {{
                  amount: integerToCurrency(
                    transaction.amount > 0
                      ? transaction.error.difference
                      : -transaction.error.difference,
                  ),
                }}
              </Trans>
            )}
          </Text>
        </Button>
      ) : !transaction.account ? (
        <Button
          variant="primary"
          style={{ height: 52, borderRadius: 14, fontSize: 16 }}
          isDisabled={!!editingField}
          onPress={event =>
            onEditField(
              transaction.id,
              'account',
              event.target.closest('button') ?? event.target,
            )
          }
        >
          <SvgPiggyBank width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Select account</Trans>
          </Text>
        </Button>
      ) : isAdding ? (
        <Button
          variant="primary"
          style={{ height: 52, borderRadius: 14, fontSize: 16 }}
          isDisabled={!!editingField}
          onPress={onAdd}
        >
          <SvgAdd width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 5,
            }}
          >
            <Trans>Add transaction</Trans>
          </Text>
        </Button>
      ) : (
        <Button
          variant="primary"
          style={{ height: 52, borderRadius: 14, fontSize: 16 }}
          isDisabled={!!editingField}
          onPress={onSave}
        >
          <SvgPencilWriteAlternate width={16} height={16} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Save changes</Trans>
          </Text>
        </Button>
      )}
    </View>
  );
}

type ChildTransactionEditProps = {
  keyboardHeader: ReactNode;
  transaction: TransactionEntity;
  negate: boolean;
  amountFocused: boolean;
  getCategory: (transaction: TransactionEntity, isOffBudget: boolean) => string;
  getPayee: (transaction: TransactionEntity) => PayeeEntity | undefined;
  getTransferAccount: (
    transaction: TransactionEntity,
  ) => AccountEntity | undefined;
  isOffBudget: boolean;
  isBudgetTransfer: (transaction: TransactionEntity) => boolean;
  onEditField: (
    id: TransactionEntity['id'],
    field: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
    anchor?: Element,
  ) => void;
  onUpdate: <Field extends keyof TransactionEntity>(
    transaction: TransactionEntity,
    field: Field,
    value: TransactionEntity[Field],
  ) => void;
  onDelete: (id: TransactionEntity['id']) => void;
};

const ChildTransactionEdit = forwardRef<
  HTMLDivElement,
  ChildTransactionEditProps
>(
  (
    {
      transaction,
      negate,
      amountFocused,
      getCategory,
      getPayee,
      getTransferAccount,
      isOffBudget,
      isBudgetTransfer,
      onEditField,
      onUpdate,
      onDelete,
      keyboardHeader,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm()!;
    const noteRef = useRef<HTMLInputElement | null>(null);

    const prettyPayee = getPrettyPayee({
      t,
      transaction,
      payee: getPayee(transaction),
      transferAccount: getTransferAccount(transaction),
    });
    return (
      <View
        innerRef={ref}
        style={{
          backgroundColor: theme.tableBackground,
          borderColor:
            transaction.amount === 0
              ? theme.tableBorderSelected
              : theme.tableBorder,
          borderWidth: '1px',
          borderRadius: 16,
          padding: '8px 0',
          margin: '8px 0',
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexBasis: '75%' }}>
            <FieldLabel title={t('Payee')} />
            <TapField
              icon={<SvgUser width={17} height={17} />}
              placeholder={
                transaction.amount > 0
                  ? t('Who paid you?')
                  : t('Who did you pay?')
              }
              rightContent={dropdownChevron}
              isDisabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'payee')
              }
              value={prettyPayee}
              onPress={event =>
                onEditField(
                  transaction.id,
                  'payee',
                  event.target.closest('button') ?? event.target,
                )
              }
              data-testid={`payee-field-${transaction.id}`}
            />
          </View>
          <View
            style={{
              flexBasis: '25%',
            }}
          >
            <FieldLabel title={t('Amount')} style={{ padding: 0 }} />
            <SplitAmountInput
              keyboardHeader={keyboardHeader}
              disabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'amount')
              }
              value={transaction.amount}
              negate={negate}
              autoFocus={amountFocused}
              onFocus={event => {
                onRequestActiveEdit(getFieldName(transaction.id, 'amount'));

                const input = event.currentTarget as HTMLInputElement;
                input.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onBlur={() => onClearActiveEdit()}
              onChange={amount => {
                onUpdate(transaction, 'amount', amount);
              }}
            />
          </View>
        </View>

        <View>
          <FieldLabel title={t('Category')} />
          <TapField
            icon={<SvgTag width={17} height={17} />}
            placeholder={t('Select a category')}
            rightContent={dropdownChevron}
            textStyle={{
              ...((isOffBudget || isBudgetTransfer(transaction)) && {
                fontStyle: 'italic',
                color: theme.pageTextSubdued,
                fontWeight: 300,
              }),
            }}
            value={getCategory(transaction, isOffBudget)}
            isDisabled={
              (!!editingField &&
                editingField !== getFieldName(transaction.id, 'category')) ||
              isOffBudget ||
              isBudgetTransfer(transaction)
            }
            onPress={event =>
              onEditField(
                transaction.id,
                'category',
                event.target.closest('button') ?? event.target,
              )
            }
            data-testid={`category-field-${transaction.id}`}
          />
        </View>

        <View>
          <FieldLabel title={t('Notes')} />
          <InputField
            ref={noteRef}
            iconStart={<SvgNotesPaper width={17} height={17} />}
            iconEnd={<NoteInsertHashButton inputRef={noteRef} />}
            placeholder={t('Add a note (optional)')}
            disabled={
              !!editingField &&
              editingField !== getFieldName(transaction.id, 'notes')
            }
            defaultValue={transaction.notes}
            onFocus={() =>
              onRequestActiveEdit(getFieldName(transaction.id, 'notes'))
            }
            onUpdate={value => onUpdate(transaction, 'notes', value)}
          />
          <NoteTagAutocomplete inputRef={noteRef} />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Button
            variant="bare"
            onPress={() => onDelete(transaction.id)}
            style={{
              height: 40,
              borderWidth: 0,
              marginLeft: styles.mobileEditingPadding,
              marginRight: styles.mobileEditingPadding,
              marginTop: 10,
              backgroundColor: 'transparent',
            }}
          >
            <SvgTrash
              width={17}
              height={17}
              style={{ color: theme.errorText }}
            />
            <Text
              style={{
                color: theme.errorText,
                marginLeft: 5,
                userSelect: 'none',
              }}
            >
              <Trans>Delete split</Trans>
            </Text>
          </Button>
        </View>
      </View>
    );
  },
);

ChildTransactionEdit.displayName = 'ChildTransactionEdit';

type TransactionEditInnerProps = {
  isAdding: boolean;
  accounts: AccountEntity[];
  categories: CategoryEntity[];
  payees: PayeeEntity[];
  dateFormat: string;
  transactions: TransactionEntity[];
  onSave: (transactions: TransactionEntity[]) => void;
  onUpdate: <Field extends keyof TransactionEntity>(
    transaction: TransactionEntity,
    field: Field,
    value?: TransactionEntity[Field],
  ) => void;
  onDelete: (id: TransactionEntity['id']) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  shouldShowSaveLocation?: boolean;
  onSaveLocation?: () => void;
  onSelectNearestPayee?: () => void;
  onRequestLocation?: () => void;
  nearestPayee?: PayeeEntity | null;
};

const TransactionEditInner = memo<TransactionEditInnerProps>(
  function TransactionEditInner({
    isAdding,
    accounts,
    categories,
    payees,
    dateFormat,
    transactions: unserializedTransactions,
    onSave,
    onUpdate,
    onDelete,
    onSplit,
    onAddSplit,
    shouldShowSaveLocation,
    onSaveLocation,
    onSelectNearestPayee,
    onRequestLocation,
    nearestPayee,
  }) {
    const { t } = useTranslation();
    const { isNarrowWidth } = useResponsive();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
    const [upcomingLength = DEFAULT_UPCOMING_SCHEDULE_DAYS] = useSyncedPref(
      'upcomingScheduledTransactionLength',
    );
    const transactions = useMemo(
      () =>
        unserializedTransactions.map(t =>
          serializeTransaction(t, dateFormat),
        ) || [],
      [unserializedTransactions, dateFormat],
    );
    const { data: { grouped: categoryGroups } = { grouped: [] } } =
      useCategories();
    const noteRef = useRef<HTMLInputElement | null>(null);
    const [entryStep, setEntryStep] = useState<'amount' | 'details'>(
      isAdding ? 'amount' : 'details',
    );
    const [continueRequest, setContinueRequest] = useState(0);
    const [incomeAtZero, setIncomeAtZero] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [fieldDropdown, setFieldDropdown] = useState<{
      transactionId: TransactionEntity['id'];
      field: TransactionDropdownField;
      anchor: RefObject<HTMLButtonElement | null>;
    } | null>(null);
    const accountDropdownTrigger = useRef<HTMLButtonElement>(null);
    const payeeDropdownTrigger = useRef<HTMLButtonElement>(null);
    const categoryDropdownTrigger = useRef<HTMLButtonElement>(null);
    const transferDropdownTrigger = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (window.history.length === 1) {
        window.history.replaceState(null, 'Actual Budget', '/');
        window.history.pushState(null, 'Add Transaction', '/transactions/new');
      }
    }, []);

    const [transaction, ...childTransactions] = transactions;

    const isFuture =
      unserializedTransactions.length > 0 &&
      isFutureTransaction(unserializedTransactions[0]);

    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm()!;
    const childTransactionElementRefMap = useRef<
      Record<TransactionEntity['id'], HTMLDivElement | null>
    >({});
    const hasAccountChanged = useRef(false);

    const payeesById = useMemo(() => groupById(payees), [payees]);
    const accountsById = useMemo(() => groupById(accounts), [accounts]);

    const getAccount = useCallback(
      (trans: TransactionEntity) => {
        return trans?.account ? accountsById?.[trans.account] : undefined;
      },
      [accountsById],
    );

    const getPayee = useCallback(
      (trans: TransactionEntity) => {
        return trans?.payee ? payeesById?.[trans.payee] : undefined;
      },
      [payeesById],
    );

    const getTransferAccount = useCallback(
      (trans: TransactionEntity) => {
        const payee = trans ? getPayee(trans) : null;
        return payee && payee?.transfer_acct
          ? accountsById?.[payee.transfer_acct]
          : undefined;
      },
      [accountsById, getPayee],
    );

    const isBudgetTransfer = useCallback(
      (trans: TransactionEntity) => {
        const transferAcct = trans ? getTransferAccount(trans) : null;
        return transferAcct ? !transferAcct.offbudget : false;
      },
      [getTransferAccount],
    );

    const getCategory = useCallback(
      (trans: TransactionEntity, isOffBudget: boolean) => {
        if (isOffBudget) {
          return t('Off budget');
        } else if (isBudgetTransfer(trans)) {
          return t('Transfer');
        } else {
          return lookupName(categories, trans.category) ?? '';
        }
      },
      [categories, isBudgetTransfer, t],
    );

    const onSaveInner = useCallback(async () => {
      const onConfirmSave = () => {
        let transactionsToSave = unserializedTransactions;
        if (isAdding) {
          transactionsToSave = realizeTempTransactions(
            unserializedTransactions,
          );
        }

        onSave(transactionsToSave);
        void navigate(-1);
      };

      if (unserializedTransactions.some(t => t.reconciled)) {
        // On mobile any save gives the warning.
        // On the web only certain changes trigger a warning.
        // Should we bring that here as well? Or does the nature of the editing form
        // make this more appropriate?
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transaction-edit',
              options: {
                onConfirm: onConfirmSave,
                confirmReason: 'editReconciled',
              },
            },
          }),
        );
      } else {
        const transferIds = unserializedTransactions
          .map(t => t.transfer_id)
          .filter((id): id is string => id != null);

        if (transferIds.length > 0) {
          const { data } = await aqlQuery(
            q('transactions')
              .filter({
                id: { $oneof: transferIds },
                reconciled: true,
              })
              .select('id'),
          );
          if ((data as TransactionEntity[]).length > 0) {
            dispatch(
              pushModal({
                modal: {
                  name: 'confirm-transaction-edit',
                  options: {
                    onConfirm: onConfirmSave,
                    confirmReason: 'batchEditWithReconciledTransfer',
                  },
                },
              }),
            );
          } else {
            onConfirmSave();
          }
        } else {
          onConfirmSave();
        }
      }
    }, [isAdding, dispatch, navigate, onSave, unserializedTransactions]);

    const onSchedule = useCallback(async () => {
      const [unserializedTransaction] = unserializedTransactions;

      if (!unserializedTransaction.account) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Account is a required field'),
            },
          }),
        );
        return;
      }

      // Already linked to a schedule; keep it as a transaction.
      if (unserializedTransaction.schedule) {
        return;
      }

      const transactionForSchedule = unserializedTransaction.is_parent
        ? {
            ...unserializedTransaction,
            subtransactions: unserializedTransactions.filter(
              t => t.is_child && t.parent_id === unserializedTransaction.id,
            ),
          }
        : unserializedTransaction;

      const createSchedule = async () => {
        try {
          await createSingleTimeScheduleFromTransaction(transactionForSchedule);
        } catch {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Failed to create schedule'),
              },
            }),
          );
          return;
        }

        try {
          if (
            !isAdding &&
            unserializedTransaction.id &&
            !unserializedTransaction.id.startsWith('temp')
          ) {
            await send('transaction-delete', {
              id: unserializedTransaction.id,
            });
          }
        } catch {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t(
                  'Schedule created, but the original transaction could not be deleted',
                ),
              },
            }),
          );
          void navigate(-1);
          return;
        }

        dispatch(
          addNotification({
            notification: {
              type: 'message',
              message: t('Schedule created successfully'),
            },
          }),
        );
        void navigate(-1);
      };

      const { isBeyondWindow, daysUntilTransaction, upcomingDays } =
        calculateFutureTransactionInfo(transactionForSchedule, upcomingLength);

      if (isBeyondWindow) {
        dispatch(
          pushModal({
            modal: {
              name: 'convert-to-schedule',
              options: {
                daysUntilTransaction,
                upcomingDays,
                onConfirm: createSchedule,
              },
            },
          }),
        );
      } else {
        await createSchedule();
      }
    }, [
      isAdding,
      dispatch,
      navigate,
      unserializedTransactions,
      upcomingLength,
      t,
    ]);

    const onUpdateInner = useCallback(
      async <Field extends keyof TransactionEntity>(
        serializedTransaction: TransactionEntity,
        name: Field,
        value: TransactionEntity[Field],
      ) => {
        const newTransaction = { ...serializedTransaction, [name]: value };
        onUpdate(newTransaction, name);
        onClearActiveEdit();

        if (name === 'account') {
          hasAccountChanged.current = serializedTransaction.account !== value;
        }
      },
      [onClearActiveEdit, onUpdate],
    );

    const onUnlockReconciledInner = useCallback(
      (serializedTransaction: TransactionEntity) => {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transaction-edit',
              options: {
                confirmReason: 'unlockReconciled',
                onConfirm: () => {
                  void onUpdateInner(
                    serializedTransaction,
                    'reconciled',
                    false,
                  );
                },
              },
            },
          }),
        );
      },
      [dispatch, onUpdateInner],
    );

    const onTotalAmountUpdate = useCallback(
      (value: number) => {
        if (transaction.amount !== value) {
          void onUpdateInner(transaction, 'amount', value);
        }
      },
      [onUpdateInner, transaction],
    );

    const onEditFieldInner = useCallback(
      (
        transactionId: TransactionEntity['id'],
        name: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
        _anchor?: Element,
      ) => {
        const transactionToEdit = transactions.find(
          t => t.id === transactionId,
        );
        const unserializedTransaction = unserializedTransactions.find(
          t => t.id === transactionId,
        );

        if (!unserializedTransaction || !transactionToEdit) {
          throw new Error(`Transaction ${transactionId} not found`);
        }

        if (name === 'category' || name === 'account' || name === 'payee') {
          const target =
            name === 'account'
              ? accountDropdownTrigger
              : name === 'payee'
                ? payeeDropdownTrigger
                : categoryDropdownTrigger;
          if (target.current) {
            setFieldDropdown({
              transactionId,
              field: name,
              anchor: target,
            });
          }
          return;
        }

        onRequestActiveEdit?.(getFieldName(transaction.id, name), () => {
          switch (name) {
            default:
              dispatch(
                pushModal({
                  modal: {
                    name: 'edit-field',
                    options: {
                      name,
                      onSubmit: (name, value) => {
                        if (typeof value === 'object' && 'useRegex' in value) {
                          void onUpdateInner(
                            transactionToEdit,
                            name,
                            applyFindReplace(
                              transactionToEdit.notes,
                              value.find,
                              value.replace,
                              value.useRegex,
                            ),
                          );
                        } else {
                          void onUpdateInner(transactionToEdit, name, value);
                        }
                      },
                      onClose: () => {
                        onClearActiveEdit();
                      },
                    },
                  },
                }),
              );
              break;
          }
        });
      },
      [
        dispatch,
        onUpdateInner,
        onClearActiveEdit,
        onRequestActiveEdit,
        transaction.id,
        transactions,
        unserializedTransactions,
      ],
    );

    const onDeleteInner = useCallback(
      async (id: TransactionEntity['id']) => {
        const [parentTransaction] = unserializedTransactions;
        const targetTransaction =
          unserializedTransactions.find(t => t.id === id) ?? parentTransaction;

        const onConfirmDelete = () => {
          dispatch(
            pushModal({
              modal: {
                name: 'confirm-delete',
                options: {
                  message: t(
                    'Are you sure you want to delete the transaction?',
                  ),
                  onConfirm: () => {
                    onDelete(id);

                    if (parentTransaction.id !== id) {
                      // Only a child transaction was deleted.
                      onClearActiveEdit();
                      return;
                    }

                    void navigate(-1);
                  },
                },
              },
            }),
          );
        };

        if (targetTransaction.reconciled) {
          dispatch(
            pushModal({
              modal: {
                name: 'confirm-transaction-edit',
                options: {
                  onConfirm: onConfirmDelete,
                  confirmReason: 'deleteReconciled',
                },
              },
            }),
          );
        } else if (targetTransaction.transfer_id) {
          const { data } = await aqlQuery(
            q('transactions')
              .filter({
                id: targetTransaction.transfer_id,
                reconciled: true,
              })
              .select('id'),
          );
          if ((data as TransactionEntity[]).length > 0) {
            dispatch(
              pushModal({
                modal: {
                  name: 'confirm-transaction-edit',
                  options: {
                    onConfirm: onConfirmDelete,
                    confirmReason: 'batchDeleteWithReconciledTransfer',
                  },
                },
              }),
            );
          } else {
            onConfirmDelete();
          }
        } else {
          onConfirmDelete();
        }
      },
      [
        dispatch,
        navigate,
        onClearActiveEdit,
        onDelete,
        unserializedTransactions,
        t,
      ],
    );

    const scrollChildTransactionIntoView = useCallback(
      (id: TransactionEntity['id']) => {
        const childTransactionEditElement =
          childTransactionElementRefMap.current?.[id];
        childTransactionEditElement?.scrollIntoView({
          behavior: 'smooth',
        });
      },
      [],
    );

    const onEmptySplitFound = useCallback(
      (id: TransactionEntity['id']) => {
        scrollChildTransactionIntoView(id);
      },
      [scrollChildTransactionIntoView],
    );

    const account = getAccount(transaction);
    const isOffBudget = account ? !!account.offbudget : false;
    const title = getPrettyPayee({
      t,
      transaction,
      payee: getPayee(transaction),
      transferAccount: getTransferAccount(transaction),
    });

    const [referenceDate] = useState(() => new Date());
    const transactionDate = parseDate(
      transaction.date,
      dateFormat,
      referenceDate,
    );
    const dateDefaultValue = monthUtils.dayFromDate(transactionDate);

    const onTransfer = () => {
      setFieldDropdown({
        transactionId: transaction.id,
        field: 'transfer',
        anchor: transferDropdownTrigger,
      });
    };
    const dropdownTransaction = transactions.find(
      t => t.id === fieldDropdown?.transactionId,
    );
    const closeDropdown = () => {
      setFieldDropdown(null);
      onClearActiveEdit();
    };
    const amountIsIncome =
      transaction.amount === 0 ? incomeAtZero : transaction.amount > 0;

    const remaining = transaction.error?.difference ?? 0;

    return (
      <Page
        className={
          isAdding && isNarrowWidth
            ? mobileTransactionEntryClassName
            : undefined
        }
        header={
          <MobilePageHeader
            title={
              isAdding
                ? t('New Transaction')
                : transaction.payee == null
                  ? t('Transaction')
                  : title
            }
            leftContent={
              <MobileBackButton
                onPress={
                  entryStep === 'details'
                    ? () => setEntryStep('amount')
                    : undefined
                }
              />
            }
          />
        }
        footer={
          entryStep === 'amount' && !isAdding ? (
            <View
              style={{
                padding: '12px 16px',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                backgroundColor: theme.mobilePageBackground,
              }}
            >
              <Button
                variant="primary"
                onPress={() => setContinueRequest(request => request + 1)}
                style={{ minHeight: 52, borderRadius: 14, fontSize: 16 }}
              >
                <Trans>Continue</Trans>
              </Button>
            </View>
          ) : (
            <Footer
              transactions={transactions}
              isAdding={isAdding}
              onAdd={onSaveInner}
              onSave={onSaveInner}
              onSchedule={onSchedule}
              onSplit={onSplit}
              onAddSplit={onAddSplit}
              onEmptySplitFound={onEmptySplitFound}
              editingField={editingField}
              isFuture={isFuture}
              onEditField={onEditFieldInner}
            />
          )
        }
        padding={0}
      >
        <View
          data-testid="transaction-form"
          style={{
            flexShrink: 0,
            margin: '8px auto 16px',
            padding: '0 12px',
            width: '100%',
            maxWidth: 560,
            boxSizing: 'border-box',
          }}
        >
          {isAdding && (
            <TransactionAmountSection
              key={transaction.id}
              value={transaction.amount}
              continueRequest={continueRequest}
              initialIncome={incomeAtZero}
              onTypeChange={setIncomeAtZero}
              autoFocus
              compact
              disableNativeAutoFocusOnIOS
              onFocus={() =>
                onRequestActiveEdit(getFieldName(transaction.id, 'amount'))
              }
              onBlur={() => onClearActiveEdit()}
              onChange={onTotalAmountUpdate}
            />
          )}
          {!isAdding && (
            <View
              role="list"
              aria-label={t('Transaction steps')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: '4px 4px 16px',
              }}
            >
              <Text
                role="listitem"
                aria-current={entryStep === 'amount' ? 'step' : undefined}
                style={{
                  color:
                    entryStep === 'amount'
                      ? theme.pageTextPositive
                      : theme.tableRowHeaderText,
                  fontWeight: 600,
                }}
              >
                <Trans>1. Amount</Trans>
              </Text>
              <View
                aria-hidden="true"
                style={{
                  height: 1,
                  flex: 1,
                  backgroundColor: theme.tableBorder,
                }}
              />
              <Text
                role="listitem"
                aria-current={entryStep === 'details' ? 'step' : undefined}
                style={{
                  color:
                    entryStep === 'details'
                      ? theme.pageTextPositive
                      : theme.tableRowHeaderText,
                  fontWeight: 600,
                }}
              >
                <Trans>2. Details</Trans>
              </Text>
            </View>
          )}
          {entryStep === 'amount' && !isAdding ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <TransactionAmountSection
                key={transaction.id}
                value={transaction.amount}
                continueRequest={continueRequest}
                initialIncome={incomeAtZero}
                onTypeChange={setIncomeAtZero}
                onContinue={() => setEntryStep('details')}
                onEnter={() => setContinueRequest(request => request + 1)}
                autoFocus={isAdding}
                disableNativeAutoFocusOnIOS
                onFocus={() =>
                  onRequestActiveEdit(getFieldName(transaction.id, 'amount'))
                }
                onBlur={() => onClearActiveEdit()}
                onChange={onTotalAmountUpdate}
              />
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.tableRowHeaderText,
                  fontSize: 15,
                  padding: '0 20px',
                  lineHeight: 1.5,
                }}
              >
                <Trans>Enter an amount, then add the details.</Trans>
              </Text>
            </View>
          ) : (
            <View
              data-testid="transaction-details"
              style={{
                gap: 16,
                colorScheme: 'light dark',
                '[data-theme="dark"] &, [data-theme="midnight"] &': {
                  colorScheme: 'dark',
                },
              }}
            >
              {!isAdding && (
                <Button
                  variant="bare"
                  aria-label={t('Edit amount')}
                  onPress={() => setEntryStep('amount')}
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    padding: '8px 4px 16px',
                    borderRadius: 12,
                    minHeight: 64,
                  }}
                >
                  <View style={{ alignItems: 'flex-start', gap: 4 }}>
                    <Text
                      style={{ color: theme.tableRowHeaderText, fontSize: 13 }}
                    >
                      {amountIsIncome ? (
                        <Trans>Income</Trans>
                      ) : (
                        <Trans>Expense</Trans>
                      )}
                    </Text>
                    <PrivacyFilter>
                      <Text
                        style={{
                          ...styles.tnum,
                          fontSize: 28,
                          fontWeight: 600,
                          color: theme.pageText,
                        }}
                      >
                        {integerToCurrency(
                          amountToInteger(Math.abs(transaction.amount)),
                        )}
                      </Text>
                    </PrivacyFilter>
                  </View>
                  <Text style={{ color: theme.pageTextPositive, fontSize: 14 }}>
                    <Trans>Edit amount</Trans>
                  </Text>
                </Button>
              )}
              <View
                style={{
                  border: `1px solid ${theme.tableBorder}`,
                  borderRadius: 16,
                  backgroundColor: theme.tableBackground,
                  overflow: 'hidden',
                }}
              >
                <TransactionEntryField
                  ref={accountDropdownTrigger}
                  label={t('Account')}
                  icon={<SvgWallet width={20} height={20} />}
                  value={account?.name}
                  placeholder={t('Select an account')}
                  data-testid="account-field"
                  isDisabled={
                    !!editingField &&
                    editingField !== getFieldName(transaction.id, 'account')
                  }
                  onPress={() => onEditFieldInner(transaction.id, 'account')}
                  aria-haspopup="dialog"
                  aria-expanded={
                    fieldDropdown?.transactionId === transaction.id &&
                    fieldDropdown.field === 'account'
                  }
                />
                <TransactionEntryField
                  ref={payeeDropdownTrigger}
                  label={t('Payee')}
                  icon={<SvgUser width={20} height={20} />}
                  value={title}
                  placeholder={
                    amountIsIncome ? t('Who paid you?') : t('Who did you pay?')
                  }
                  data-testid="payee-field"
                  isDisabled={
                    !!editingField &&
                    editingField !== getFieldName(transaction.id, 'payee')
                  }
                  onPress={() => onEditFieldInner(transaction.id, 'payee')}
                  aria-haspopup="dialog"
                  aria-expanded={
                    fieldDropdown?.transactionId === transaction.id &&
                    fieldDropdown.field === 'payee'
                  }
                />
                {!transaction.is_parent && (
                  <TransactionEntryField
                    ref={categoryDropdownTrigger}
                    label={t('Category')}
                    icon={<SvgTag width={20} height={20} />}
                    value={getCategory(transaction, isOffBudget)}
                    placeholder={t('Select a category')}
                    data-testid="category-field"
                    isDisabled={
                      (!!editingField &&
                        editingField !==
                          getFieldName(transaction.id, 'category')) ||
                      isOffBudget ||
                      isBudgetTransfer(transaction)
                    }
                    onPress={() => onEditFieldInner(transaction.id, 'category')}
                    aria-haspopup="dialog"
                    aria-expanded={
                      fieldDropdown?.transactionId === transaction.id &&
                      fieldDropdown.field === 'category'
                    }
                  />
                )}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '8px 16px',
                    gap: 12,
                    borderBottom: `1px solid ${theme.tableBorder}`,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text
                      style={{ fontSize: 12, color: theme.tableRowHeaderText }}
                    >
                      <Trans>Date</Trans>
                    </Text>
                    <InputField
                      type="date"
                      aria-label={t('Date')}
                      required
                      disabled={
                        !!editingField &&
                        editingField !== getFieldName(transaction.id, 'date')
                      }
                      style={{
                        margin: 0,
                        border: 0,
                        borderRadius: 0,
                        height: 36,
                        padding: 0,
                        width: '100%',
                        minWidth: 0,
                        backgroundColor: 'transparent',
                        fontSize: 15,
                      }}
                      defaultValue={dateDefaultValue}
                      onBlur={() => onClearActiveEdit()}
                      onFocus={() =>
                        onRequestActiveEdit(
                          getFieldName(transaction.id, 'date'),
                        )
                      }
                      onChange={event =>
                        onUpdateInner(
                          transaction,
                          'date',
                          formatDate(parseISO(event.target.value), dateFormat),
                        )
                      }
                    />
                  </View>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 44,
                      cursor: 'pointer',
                      color: theme.pageText,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label={
                        transaction.reconciled ? t('Reconciled') : t('Cleared')
                      }
                      checked={
                        !!(transaction.reconciled || transaction.cleared)
                      }
                      disabled={!!editingField}
                      onChange={() =>
                        transaction.reconciled
                          ? onUnlockReconciledInner(transaction)
                          : onUpdateInner(
                              transaction,
                              'cleared',
                              !transaction.cleared,
                            )
                      }
                      style={{
                        width: 22,
                        height: 22,
                        margin: 0,
                        accentColor: theme.buttonPrimaryBackground,
                      }}
                    />
                    {transaction.reconciled ? (
                      <Trans>Reconciled</Trans>
                    ) : (
                      <Trans>Cleared</Trans>
                    )}
                  </label>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '4px 8px',
                  }}
                >
                  <Button
                    variant="bare"
                    aria-expanded={showNotes || !!transaction.notes}
                    onPress={() => setShowNotes(show => !show)}
                    style={{
                      flex: 1,
                      justifyContent: 'flex-start',
                      minHeight: 48,
                      gap: 12,
                      padding: '0 8px',
                      color: theme.tableRowHeaderText,
                    }}
                  >
                    <SvgNotesPaper width={20} height={20} aria-hidden="true" />
                    {showNotes || transaction.notes ? (
                      <Trans>Notes</Trans>
                    ) : (
                      <Trans>Add a note</Trans>
                    )}
                  </Button>
                  {shouldShowSaveLocation ? (
                    <Button
                      variant="bare"
                      onPress={onSaveLocation}
                      aria-label={t('Save location')}
                      style={{ minHeight: 44, gap: 6 }}
                    >
                      <Trans>Save</Trans>
                      <SvgLocation width={18} height={18} />
                    </Button>
                  ) : nearestPayee && !transaction.payee ? (
                    <Button
                      variant="bare"
                      onPress={onSelectNearestPayee}
                      style={{ minHeight: 44, gap: 6 }}
                    >
                      <Trans>Nearby</Trans>
                      <SvgLocation width={18} height={18} />
                    </Button>
                  ) : onRequestLocation && !transaction.payee ? (
                    <Button
                      variant="bare"
                      aria-label={t('Request Location')}
                      onPress={onRequestLocation}
                      style={{ minHeight: 44, minWidth: 44 }}
                    >
                      <SvgLocation width={18} height={18} />
                    </Button>
                  ) : null}
                </View>
                {(showNotes || !!transaction.notes) && (
                  <View
                    style={{
                      padding: '0 8px 12px',
                      '&& input::placeholder': {
                        color: theme.tableRowHeaderText,
                        opacity: 1,
                      },
                    }}
                  >
                    <InputField
                      ref={noteRef}
                      aria-label={t('Notes')}
                      iconEnd={<NoteInsertHashButton inputRef={noteRef} />}
                      placeholder={t('Add a note (optional)')}
                      disabled={
                        !!editingField &&
                        editingField !== getFieldName(transaction.id, 'notes')
                      }
                      defaultValue={transaction.notes}
                      onFocus={() =>
                        onRequestActiveEdit(
                          getFieldName(transaction.id, 'notes'),
                        )
                      }
                      onBlur={() => onClearActiveEdit()}
                      onChange={event =>
                        onUpdateInner(transaction, 'notes', event.target.value)
                      }
                    />
                    <NoteTagAutocomplete inputRef={noteRef} />
                  </View>
                )}
              </View>
              {!isAdding && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button
                    ref={transferDropdownTrigger}
                    onPress={onTransfer}
                    aria-haspopup="dialog"
                    aria-controls={
                      fieldDropdown?.field === 'transfer'
                        ? 'transaction-field-dropdown'
                        : undefined
                    }
                    aria-expanded={fieldDropdown?.field === 'transfer'}
                    isDisabled={!!editingField}
                    style={{
                      minHeight: 48,
                      flex: 1,
                      gap: 8,
                      borderRadius: 12,
                    }}
                  >
                    <SvgWallet width={18} height={18} />
                    <Trans>Transfer</Trans>
                  </Button>
                  <Button
                    onPress={() => onSplit(transaction.id)}
                    isDisabled={
                      !!editingField ||
                      !!childTransactions.length ||
                      transaction.amount === 0
                    }
                    style={{
                      minHeight: 48,
                      flex: 1,
                      gap: 8,
                      borderRadius: 12,
                    }}
                  >
                    <SvgSplit width={18} height={18} />
                    <Trans>Split</Trans>
                  </Button>
                </View>
              )}
              {childTransactions.map((childTrans, i, arr) => (
                <ChildTransactionEdit
                  key={childTrans.id}
                  transaction={childTrans}
                  negate={transaction.amount <= 0}
                  amountFocused={arr.findIndex(c => c.amount === 0) === i}
                  ref={r => {
                    childTransactionElementRefMap.current = {
                      ...childTransactionElementRefMap.current,
                      [childTrans.id]: r,
                    };
                  }}
                  isOffBudget={isOffBudget}
                  getCategory={getCategory}
                  getPayee={getPayee}
                  getTransferAccount={getTransferAccount}
                  isBudgetTransfer={isBudgetTransfer}
                  onUpdate={onUpdateInner}
                  onEditField={onEditFieldInner}
                  onDelete={onDeleteInner}
                  keyboardHeader={
                    <FillRemainingButton
                      remaining={remaining}
                      onPress={() => {
                        void onUpdateInner(
                          childTrans,
                          'amount',
                          integerToAmount(remaining),
                        );
                      }}
                    />
                  }
                />
              ))}
            </View>
          )}

          {!isAdding && entryStep === 'details' && (
            <View style={{ alignItems: 'center' }}>
              <Button
                variant="bare"
                onPress={() => onDeleteInner(transaction.id)}
                style={{
                  height: 40,
                  borderWidth: 0,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                  marginTop: 10,
                  backgroundColor: 'transparent',
                }}
              >
                <SvgTrash
                  width={17}
                  height={17}
                  style={{ color: theme.errorText }}
                />
                <Text
                  style={{
                    color: theme.errorText,
                    marginLeft: 5,
                    userSelect: 'none',
                  }}
                >
                  <Trans>Delete transaction</Trans>
                </Text>
              </Button>
            </View>
          )}
        </View>
        {fieldDropdown && dropdownTransaction && (
          <TransactionFieldDropdown
            key={`${fieldDropdown.transactionId}-${fieldDropdown.field}`}
            anchor={fieldDropdown.anchor}
            field={fieldDropdown.field}
            account={transaction.account ?? undefined}
            hasPayee={!!dropdownTransaction.payee}
            date={
              unserializedTransactions.find(
                t => t.id === dropdownTransaction.id,
              )?.date ?? monthUtils.currentDay()
            }
            categoryGroups={categoryGroups}
            showHiddenCategories={showHiddenCategories ?? false}
            onClose={closeDropdown}
            onSelect={id => {
              const field = fieldDropdown.field;
              const value =
                field === 'transfer'
                  ? payees.find(payee => payee.transfer_acct === id)?.id
                  : id;
              closeDropdown();
              if (value !== undefined) {
                void onUpdateInner(
                  dropdownTransaction,
                  field === 'transfer' ? 'payee' : field,
                  value,
                );
              }
            }}
          />
        )}
      </Page>
    );
  },
);

function isTemporary(transaction: TransactionEntity) {
  return transaction.id.indexOf('temp') === 0;
}

type TransactionEditUnconnectedProps = {
  categories: CategoryEntity[];
  accounts: AccountEntity[];
  payees: PayeeEntity[];
  lastTransaction: TransactionEntity | null;
  dateFormat: string;
};

function TransactionEditUnconnected({
  categories,
  accounts,
  payees,
  lastTransaction,
  dateFormat,
}: TransactionEditUnconnectedProps) {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const { state: locationState } = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const updatePayeeLocationMutation = useSavePayeeLocationMutation();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [fetchedTransactions, setFetchedTransactions] = useState<
    TransactionEntity[]
  >([]);
  const transactionsRef = useRef(transactions);
  useLayoutEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);
  const isAdding = useRef(false);
  const isDeleted = useRef(false);
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const [defaultTransactionAccount] = useSyncedPref(
    'defaultTransactionAccount',
  );
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  const searchParamCategory = useMemo(
    () => categories.find(c => c.name === searchParams.get('category'))?.id,
    [categories, searchParams],
  );
  const searchParamAccount = useMemo(
    () => accounts.find(a => a.name === searchParams.get('account'))?.id,
    [accounts, searchParams],
  );
  const searchParamPayee = useMemo(
    () => payees.find(p => p.name === searchParams.get('payee'))?.id,
    [payees, searchParams],
  );

  const {
    isGranted: isLocationGranted,
    isPending: shouldPromptLocation,
    requestPermission,
  } = useLocationPermission();
  const { data: nearbyPayees = [] } = useNearbyPayees({
    enabled: isLocationGranted,
  });
  const [shouldShowSaveLocation, setShouldShowSaveLocation] = useState(false);
  const nearestPayee = nearbyPayees[0]?.payee ?? null;

  useEffect(() => {
    let unmounted = false;

    async function fetchTransaction() {
      // Query for the transaction based on the ID with grouped splits.
      //
      // This means if the transaction in question is a split transaction, its
      // subtransactions will be returned in the `substransactions` property on
      // the parent transaction.
      //
      // The edit item components expect to work with a flat array of
      // transactions when handling splits, so we call ungroupTransactions to
      // flatten parent and children into one array.
      const { data } = await aqlQuery(
        q('transactions')
          .filter({ id: transactionId })
          .select('*')
          .options({ splits: 'grouped' }),
      );

      if (!unmounted) {
        const fetchedTransactions = ungroupTransactions(data);
        setTransactions(fetchedTransactions);
        setFetchedTransactions(fetchedTransactions);
      }
    }
    if (transactionId !== 'new') {
      void fetchTransaction();
    } else {
      isAdding.current = true;
    }

    return () => {
      unmounted = true;
    };
  }, [transactionId]);

  useEffect(() => {
    if (!isLocationGranted) {
      setShouldShowSaveLocation(false);
    }
  }, [isLocationGranted]);

  useEffect(() => {
    if (isAdding.current) {
      setTransactions([
        {
          id: 'temp',
          date: (() => {
            const dateParam = searchParams.get('date') || '';
            if (!isNaN(Date.parse(dateParam))) {
              return dateParam;
            }
            return lastTransaction?.date || monthUtils.currentDay();
          })(),
          payee: searchParamPayee,
          account:
            searchParamAccount ||
            locationState?.accountId ||
            defaultTransactionAccount ||
            lastTransaction?.account ||
            null,
          category: searchParamCategory || locationState?.categoryId || null,
          amount: -amountToInteger(
            parseFloat(searchParams.get('amount') || '') || 0,
          ),
          cleared: searchParams.get('cleared') === 'true',
          notes: searchParams.get('notes') || '',
        },
      ]);
    }
  }, [
    locationState?.accountId,
    locationState?.categoryId,
    defaultTransactionAccount,
    lastTransaction,
    searchParamAccount,
    searchParamCategory,
    searchParamPayee,
    searchParams,
  ]);

  // Fields the user explicitly emptied while entering the new transaction,
  // tracked per transaction row so a clear on one split row doesn't affect
  // its siblings. Rules re-run on every field commit, and they may not
  // re-fill these (e.g. a cleared pre-assigned category must stay cleared).
  const clearedFields = useRef(new Map<TransactionEntity['id'], Set<string>>());

  const onUpdate = useCallback(
    async (
      serializedTransaction: TransactionEntity,
      updatedField: keyof TransactionEntity,
    ) => {
      const transaction = deserializeTransaction(
        serializedTransaction,
        null,
        dateFormat,
      );

      // Run the rules to auto-fill in any data. Right now we only do
      // this on new transactions because that's how desktop works.
      const newTransaction = { ...transaction };
      const changedFields = new Set<keyof TransactionEntity>([updatedField]);
      if (isTemporary(newTransaction)) {
        trackClearedField(clearedFields.current, newTransaction, updatedField);
        const clearedOnThisRow = getClearedFieldNames(
          clearedFields.current,
          newTransaction.id,
        );

        // Mobile keeps splits as a flat parent+children list. Group them
        // before rules-run so an already-applied split rule sees existing
        // children (same as desktop). Otherwise re-running the rule creates
        // new child ids and later parent edits (notes/account) fail (#9189).
        const transactionForRules = transactionForRulesFromList(
          transactionsRef.current,
          newTransaction,
        );

        const afterRules = await send('rules-run', {
          transaction: transactionForRules,
        });
        const diff = getChangedValues(transactionForRules, afterRules);

        if (diff) {
          Object.keys(diff).forEach(key => {
            const field = key as keyof TransactionEntity;
            // Apply rule changes to "empty" fields and append/prepend notes rules
            // (see shouldApplyRuleChange).
            // Or update all fields if the payee changes (assists location-based entry by
            // applying rules to prefill category, notes, etc. based on the selected payee)
            // — except fields the user explicitly cleared, which must stay empty.
            if (
              !clearedOnThisRow.includes(field) &&
              (updatedField === 'payee' ||
                shouldApplyRuleChange(
                  field,
                  Reflect.get(transactionForRules, field),
                  diff[field],
                ))
            ) {
              (newTransaction as Record<string, unknown>)[field] = diff[field];
              changedFields.add(field);
            }
          });

          const parentForPropagate: TransactionEntity = {
            ...transactionForRules,
            ...newTransaction,
          };
          const subtransactions = propagateRuleChangeToSubtransactions(
            parentForPropagate,
            diff.subtransactions,
            updatedField,
            clearedFields.current,
          );
          if (subtransactions) {
            newTransaction.subtransactions = subtransactions;
            changedFields.add('subtransactions');
          } else if (
            diff.subtransactions &&
            (updatedField === 'payee' ||
              shouldApplyRuleChange(
                'subtransactions',
                transactionForRules.subtransactions,
                diff.subtransactions,
              ))
          ) {
            // First time a split rule converts this row into a parent.
            newTransaction.subtransactions = diff.subtransactions;
            changedFields.add('subtransactions');
          }
        }
      }

      // Updates can be in flight at the same time (e.g. an amount blur
      // racing a nearby payee press), so merge only the changed fields onto
      // the latest state rather than replacing the whole transaction.
      setTransactions(prevTransactions => {
        const latestTransaction = prevTransactions.find(
          t => t.id === newTransaction.id,
        );
        if (!latestTransaction) {
          // The transaction was deleted while this update was in flight.
          return prevTransactions;
        }
        const merged = { ...latestTransaction };
        for (const field of changedFields) {
          (merged as Record<string, unknown>)[field] = newTransaction[field];
        }

        // When editing a split parent without a fresh subtransactions payload
        // from rules, re-attach the latest children so updateTransaction keeps
        // the existing split structure.
        if (
          !merged.subtransactions &&
          (merged.is_parent || latestTransaction.is_parent)
        ) {
          const children = prevTransactions.filter(
            t => t.is_child && t.parent_id === merged.id,
          );
          merged.subtransactions = children;
          merged.is_parent = true;

          const updated = updateTransaction(prevTransactions, merged).data;
          // updateTransaction → makeChild clears child.error; restore any that
          // were already on the flat list so split-error UI stays correct.
          const childErrors = new Map(
            children
              .filter(c => c.error != null)
              .map(c => [c.id, c.error!] as const),
          );
          if (childErrors.size === 0) {
            return updated;
          }
          return updated.map(t => {
            const error = childErrors.get(t.id);
            return error !== undefined ? { ...t, error } : t;
          });
        }

        return updateTransaction(prevTransactions, merged).data;
      });

      if (updatedField === 'payee') {
        setShouldShowSaveLocation(false);

        if (newTransaction.payee && isLocationGranted) {
          const payeeLocations = await locationService.getPayeeLocations(
            newTransaction.payee,
          );
          if (payeeLocations.length === 0) {
            setShouldShowSaveLocation(true);
          } else {
            const currentPosition = await locationService.getCurrentPosition();
            const hasNearby = payeeLocations.some(
              loc =>
                calculateDistance(currentPosition, {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                }) <= DEFAULT_MAX_DISTANCE_METERS,
            );
            if (!hasNearby) {
              setShouldShowSaveLocation(true);
            }
          }
        }
      }
    },
    [dateFormat, isLocationGranted],
  );

  const onSave = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      if (isDeleted.current) {
        return;
      }

      const changes = diffItems(fetchedTransactions || [], newTransactions);
      if (
        changes.added.length > 0 ||
        changes.updated.length > 0 ||
        changes.deleted.length
      ) {
        const _remoteUpdates = await send('transactions-batch-update', {
          added: changes.added,
          deleted: changes.deleted,
          updated: changes.updated,
          learnCategories: isLearnCategoriesEnabled,
        });

        // if (onTransactionsChange) {
        //   onTransactionsChange({
        //     ...changes,
        //     updated: changes.updated.concat(remoteUpdates),
        //   });
        // }
      }

      if (isAdding.current) {
        // The first one is always the "parent" and the only one we care
        // about
        dispatch(setLastTransaction({ transaction: newTransactions[0] }));
      }
    },
    [dispatch, fetchedTransactions, isLearnCategoriesEnabled],
  );

  const onDelete = useCallback(
    async (id: TransactionEntity['id']) => {
      const changes = deleteTransaction(transactions, id);

      if (isAdding.current) {
        // Adding a new transactions, this disables saving when the component unmounts
        isDeleted.current = true;
      } else {
        const _remoteUpdates = await send('transactions-batch-update', {
          deleted: changes.diff.deleted,
        });

        // if (onTransactionsChange) {
        //   onTransactionsChange({ ...changes, updated: remoteUpdates });
        // }
      }

      setTransactions(changes.data);
    },
    [transactions],
  );

  const onAddSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = addSplitTransaction(transactions, id);
      setTransactions(changes.data);
    },
    [transactions],
  );

  const onSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = splitTransaction(
        transactions,
        id,
        makeEmptySplitSubtransactions,
      );

      setTransactions(changes.data);
    },
    [transactions],
  );

  const onSaveLocation = useCallback(async () => {
    try {
      const [transaction] = transactions;
      if (transaction.payee) {
        await updatePayeeLocationMutation.mutateAsync(transaction.payee);
        setShouldShowSaveLocation(false);
      }
    } catch (error) {
      console.error('Failed to save location', { error });
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to save location'),
          },
        }),
      );
    }
  }, [t, transactions, dispatch, updatePayeeLocationMutation]);

  const onSelectNearestPayee = useCallback(() => {
    const transaction = transactions[0];
    if (!nearestPayee || !transaction || transaction.payee) {
      return;
    }

    const updated = {
      ...serializeTransaction(transaction, dateFormat),
      payee: nearestPayee.id,
    };
    void onUpdate(updated, 'payee');
  }, [transactions, nearestPayee, onUpdate, dateFormat]);

  if (accounts.length === 0) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('New Transaction')}
            leftContent={<MobileBackButton />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: theme.mobilePageBackground,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: '1.5em',
            }}
          >
            <Trans>
              To add a transaction, you need to{' '}
              <strong>create an account first</strong>. You can add an account
              from the accounts page.
            </Trans>
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              dispatch(
                pushModal({
                  modal: { name: 'add-account', options: {} },
                }),
              );
            }}
          >
            <Trans>Add account</Trans>
          </Button>
        </View>
      </Page>
    );
  }

  if (categories.length === 0) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('New Transaction')}
            leftContent={<MobileBackButton />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: theme.mobilePageBackground,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: '1.5em',
            }}
          >
            <Trans>
              To add a transaction, you need to{' '}
              <strong>create a category first</strong>. You can add categories
              from the budget page.
            </Trans>
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              void navigate('/budget');
            }}
          >
            <Trans>Go to budget</Trans>
          </Button>
        </View>
      </Page>
    );
  }

  // This check ensures the component only renders after the transaction state
  // has been properly initialized. When creating a new transaction (transactionId === 'new'),
  // the transaction is created in a useEffect that runs after the component mounts.
  // Returning null here acts as a loading state until that initialization completes.
  if (transactions.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.pageBackground,
      }}
    >
      <TransactionEditInner
        transactions={transactions}
        isAdding={isAdding.current}
        categories={categories}
        accounts={accounts}
        payees={payees}
        dateFormat={dateFormat}
        onUpdate={onUpdate}
        onSave={onSave}
        onDelete={onDelete}
        onSplit={onSplit}
        onAddSplit={onAddSplit}
        shouldShowSaveLocation={shouldShowSaveLocation}
        onSaveLocation={onSaveLocation}
        onSelectNearestPayee={onSelectNearestPayee}
        nearestPayee={isLocationGranted ? nearestPayee : null}
        onRequestLocation={shouldPromptLocation ? requestPermission : undefined}
      />
    </View>
  );
}

export const TransactionEdit = () => {
  const { data: { list: categories } = { list: [] } } = useCategories();
  const { data: payees = [] } = usePayees();
  const lastTransaction = useSelector(
    state => state.transactions.lastTransaction,
  );
  const { data: accounts = [] } = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  return (
    <SingleActiveEditFormProvider formName="mobile-transaction">
      <TransactionEditUnconnected
        categories={categories}
        payees={payees}
        lastTransaction={lastTransaction}
        accounts={accounts}
        dateFormat={dateFormat}
      />
    </SingleActiveEditFormProvider>
  );
};

function FillRemainingButton({
  remaining,
  onPress,
}: {
  readonly remaining: number;
  readonly onPress: () => void;
}) {
  return (
    <Button
      variant="primary"
      style={{ height: styles.mobileMinHeight }}
      onPress={onPress}
      isDisabled={remaining === 0}
    >
      <SvgSplit width={17} height={17} />
      <Text
        style={{
          ...styles.text,
          marginLeft: 6,
        }}
      >
        <Trans>
          Use remaining:{' '}
          {{
            amount: integerToCurrency(Math.abs(remaining)),
          }}
        </Trans>
      </Text>
    </Button>
  );
}
