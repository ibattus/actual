import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type TransactionEntryFieldProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'value'
> & {
  label: string;
  value?: string;
  placeholder: string;
  icon: ReactNode;
};

export function TransactionEntryField({
  label,
  value,
  placeholder,
  icon,
  ...props
}: TransactionEntryFieldProps) {
  return (
    <Button
      {...props}
      variant="bare"
      style={{
        width: '100%',
        minHeight: 68,
        borderRadius: 0,
        padding: '12px 16px',
        gap: 14,
        justifyContent: 'flex-start',
        textAlign: 'left',
        borderBottom: `1px solid ${theme.tableBorder}`,
        ...props.style,
      }}
    >
      <View
        aria-hidden="true"
        style={{ color: theme.tableRowHeaderText, flexShrink: 0 }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text
          style={{
            color: theme.tableRowHeaderText,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: value ? 600 : 400,
            color: value ? theme.pageText : theme.tableRowHeaderText,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value || placeholder}
        </Text>
      </View>
      <SvgCheveronDown
        width={14}
        height={14}
        aria-hidden="true"
        style={{ color: theme.tableRowHeaderText, flexShrink: 0 }}
      />
    </Button>
  );
}
