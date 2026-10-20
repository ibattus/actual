import type { ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';

type MobileSheetRowProps = {
  label: ReactNode;
  onPress: () => void;
  isDestructive?: boolean;
  isPressed?: boolean;
};

export function MobileSheetRow({
  label,
  onPress,
  isDestructive = false,
  isPressed,
}: MobileSheetRowProps) {
  return (
    <Button
      variant="bare"
      aria-pressed={isPressed}
      onPress={onPress}
      style={{
        ...styles.mediumText,
        width: '100%',
        minHeight: 52,
        justifyContent: 'flex-start',
        padding: `${spacing.sm}px ${spacing.lg}px`,
        borderRadius: 0,
        borderTop: `1px solid ${theme.tooltipBorder}`,
        color: isDestructive ? theme.errorText : theme.pageText,
      }}
    >
      <Text style={{ ...styles.ellipsisText, textAlign: 'left' }}>{label}</Text>
    </Button>
  );
}
