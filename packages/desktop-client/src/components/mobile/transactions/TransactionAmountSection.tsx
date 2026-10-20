import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { amountToCurrency } from '@actual-app/core/shared/util';

import { usePrivacyMode } from '#hooks/usePrivacyMode';

import { AmountInput } from './AmountInput';
import type { AmountInputProps } from './AmountInput';

type TransactionAmountSectionProps = AmountInputProps & {
  continueRequest: number;
  initialIncome?: boolean;
  onTypeChange: (income: boolean) => void;
  onContinue?: () => void;
  compact?: boolean;
};

export function TransactionAmountSection({
  value,
  onChange,
  disabled,
  continueRequest,
  initialIncome = false,
  onTypeChange,
  onContinue,
  compact = false,
  ...props
}: TransactionAmountSectionProps) {
  const { t } = useTranslation();
  const { width } = useResponsive();
  const privacyMode = usePrivacyMode();
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [hasInteractedWithAmount, setHasInteractedWithAmount] = useState(false);
  const formattedLength = amountToCurrency(Math.abs(value)).length;
  const amountFontSize = Math.min(
    52,
    Math.max(20, (Math.min(width, 560) - 88) / (formattedLength * 0.64)),
  );
  const [incomeAtZero, setIncomeAtZero] = useState(value > 0 || initialIncome);
  const [pendingType, setPendingType] = useState<boolean | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const handledContinue = useRef(continueRequest);
  const [isContinuing, setIsContinuing] = useState(false);
  const pendingAmount = useRef<number | null>(null);
  const previousValue = useRef(value);
  const isIncome = pendingType ?? (value === 0 ? incomeAtZero : value > 0);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }
    previousValue.current = value;
    pendingAmount.current = null;
    if (pendingType !== null) {
      if (value === 0 || value > 0 === pendingType) {
        setPendingType(null);
      } else {
        onChange?.(pendingType ? Math.abs(value) : -Math.abs(value));
      }
    }
  }, [value, pendingType, onChange]);

  useEffect(() => {
    if (continueRequest === handledContinue.current) {
      return;
    }
    handledContinue.current = continueRequest;
    amountRef.current?.blur();
    setIsContinuing(true);
  }, [continueRequest]);

  useEffect(() => {
    if (
      isContinuing &&
      pendingType === null &&
      (pendingAmount.current === null || pendingAmount.current === value)
    ) {
      setIsContinuing(false);
      onContinue?.();
    }
  }, [isContinuing, pendingType, value, onContinue]);

  function selectType(income: boolean) {
    setIncomeAtZero(income);
    onTypeChange(income);
    // Blurring the amount runs rules asynchronously. Apply a type change to
    // that committed amount, rather than overwriting it with the old value.
    if (pendingAmount.current !== null && pendingAmount.current !== value) {
      setPendingType(income);
    } else if (value !== 0) {
      onChange?.(income ? Math.abs(value) : -Math.abs(value));
    }
  }

  return (
    <View
      data-testid="transaction-amount-section"
      style={{
        alignItems: 'center',
        padding: compact ? '8px 0' : '32px 0',
        gap: compact ? 8 : 24,
      }}
    >
      <View
        data-testid="transaction-amount"
        style={{
          minHeight: compact ? 68 : 82,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          '&:focus-within': {
            borderBottomColor: theme.formInputBorderSelected,
          },
          borderBottom: `2px solid transparent`,
        }}
      >
        <AmountInput
          {...props}
          aria-label={t('Amount')}
          inputRef={amountRef}
          onAmountPress={() => setHasInteractedWithAmount(true)}
          onFocus={event => {
            setIsAmountFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={event => {
            setIsAmountFocused(false);
            props.onBlur?.(event);
          }}
          value={value}
          onChange={amount => {
            setHasInteractedWithAmount(true);
            pendingAmount.current = amount;
            onChange?.(amount);
          }}
          negate={!isIncome}
          disabled={disabled}
          variant="large"
          hideSignToggle
          style={{
            borderWidth: 0,
            backgroundColor: 'transparent',
            maxWidth: '100%',
          }}
          textStyle={{
            ...styles.tnum,
            fontSize: amountFontSize,
            fontFamily:
              privacyMode && !isAmountFocused ? 'Redacted Script' : undefined,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color:
              value === 0 && !hasInteractedWithAmount
                ? theme.tableRowHeaderText
                : theme.pageText,
            opacity: value === 0 && !hasInteractedWithAmount ? 0.55 : 1,
          }}
        />
      </View>
      <View
        role="group"
        aria-label={t('Transaction type')}
        style={{
          flexDirection: 'row',
          gap: 4,
          padding: 4,
          borderRadius: 12,
          backgroundColor: theme.tableBackground,
          border: `1px solid ${theme.tableBorder}`,
          width: 244,
          maxWidth: '100%',
        }}
      >
        {[false, true].map(income => (
          <Button
            key={String(income)}
            variant="bare"
            aria-pressed={isIncome === income}
            isDisabled={disabled}
            onPress={() => selectType(income)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color:
                isIncome === income
                  ? theme.pageTextPositive
                  : theme.tableRowHeaderText,
              backgroundColor:
                isIncome === income ? theme.pillBackgroundLight : 'transparent',
              border:
                isIncome === income
                  ? `1px solid ${theme.tableBorder}`
                  : '1px solid transparent',
            }}
          >
            {income ? <Trans>Income</Trans> : <Trans>Expense</Trans>}
          </Button>
        ))}
      </View>
    </View>
  );
}
