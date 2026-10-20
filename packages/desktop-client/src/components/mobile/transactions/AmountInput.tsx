import { memo, useEffect, useState } from 'react';
import type { CSSProperties, FocusEvent } from 'react';

import { styles } from '@actual-app/components/styles';
import * as Platform from '@actual-app/core/shared/platform';

import { useFeatureFlag } from '#hooks/useFeatureFlag';

import { CalculatorAmountInput } from './CalculatorAmountInput';
import type { CalculatorAmountInputProps } from './CalculatorAmountInput';
import { FocusableAmountInput } from './FocusableAmountInput';

export type AmountInputProps = Omit<CalculatorAmountInputProps, 'onFocus'> & {
  disableNativeAutoFocusOnIOS?: boolean;
  hideSignToggle?: boolean;
  textStyle?: CSSProperties;
  onFocus?: (event?: FocusEvent<HTMLInputElement>) => void;
  onAmountPress?: () => void;
};

export const AmountInput = memo(function AmountInput({
  autoFocus = false,
  disableNativeAutoFocusOnIOS = false,
  disabled,
  hideSignToggle,
  textStyle,
  inputRef,
  negate = false,
  onBlur,
  onChange,
  onEnter,
  onFocus,
  onAmountPress,
  value,
  variant = 'normal',
  ...props
}: AmountInputProps) {
  const mobileCalculatorEnabled = useFeatureFlag('mobileCalculator');
  const fallbackAutoFocus =
    autoFocus && !(disableNativeAutoFocusOnIOS && Platform.isIOSAgent);
  const [focused, setFocused] = useState(fallbackAutoFocus);

  useEffect(() => {
    if (fallbackAutoFocus) {
      setFocused(true);
    }
  }, [fallbackAutoFocus]);

  if (mobileCalculatorEnabled) {
    return (
      <CalculatorAmountInput
        {...props}
        autoFocus={autoFocus}
        autoFocusIndirect={disableNativeAutoFocusOnIOS}
        disabled={disabled}
        inputRef={inputRef}
        negate={negate}
        onBlur={onBlur}
        onChange={onChange}
        onEnter={onEnter}
        onFocus={onFocus}
        value={value}
        variant={variant}
        style={{ ...props.style, ...textStyle }}
      />
    );
  }

  return (
    <FocusableAmountInput
      {...props}
      onAmountPress={onAmountPress}
      disabled={disabled}
      hideSignToggle={hideSignToggle}
      focused={focused}
      inputRef={inputRef}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      onEnter={() => onEnter?.()}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onUpdateAmount={onChange}
      sign={value === 0 ? undefined : value < 0 ? '-' : '+'}
      focusedStyle={
        variant === 'large'
          ? {
              width: 'auto',
              padding: '5px',
              paddingLeft: '20px',
              paddingRight: '20px',
              minWidth: '100%',
            }
          : undefined
      }
      style={props.style}
      textStyle={{
        ...(variant === 'large' && {
          ...styles.veryLargeText,
          textAlign: 'center',
        }),
        ...textStyle,
      }}
      value={value}
      zeroSign={negate ? '-' : '+'}
    />
  );
});
