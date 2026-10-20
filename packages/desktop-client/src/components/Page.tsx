import React, { createContext, useContext, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgViewHide, SvgViewShow } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useSyncedPref } from '#hooks/useSyncedPref';

const HEADER_HEIGHT = 56;

type PageHeaderProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export function PageHeader({ title, style }: PageHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginLeft: 20,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          fontSize: 25,
          fontWeight: 500,
        }}
      >
        {typeof title === 'string' ? <Text>{title}</Text> : title}
      </View>
    </View>
  );
}

type MobilePageHeaderProps = {
  title: ReactNode;
  style?: CSSProperties;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
};

export function MobilePageHeader({
  title,
  style,
  leftContent,
  rightContent,
}: MobilePageHeaderProps) {
  const { t } = useTranslation();
  const [privacyPref, setPrivacyPref] = useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(privacyPref) === 'true';

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        height: HEADER_HEIGHT,
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        backgroundColor: theme.mobileHeaderBackground,
        '& *': {
          color: theme.mobileHeaderText,
        },
        '& button[data-pressed]': {
          backgroundColor: theme.mobileHeaderTextHover,
        },
        '& button': {
          minWidth: 44,
          minHeight: 44,
          flexShrink: 0,
        },
        ...style,
      }}
    >
      <View
        style={{
          minWidth: 44,
          flexShrink: 0,
          justifyContent: 'flex-start',
          flexDirection: 'row',
        }}
      >
        {leftContent}
      </View>
      <h1
        style={{
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          flex: 1,
          minWidth: 0,
          fontSize: 20,
          fontWeight: 600,
          overflow: 'hidden',
          display: 'flex',
          margin: 0,
          padding: 0,
        }}
      >
        {title}
      </h1>
      <View
        style={{
          minWidth: 44,
          flexShrink: 0,
          justifyContent: 'flex-end',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Button
          variant="bare"
          aria-label={
            isPrivacyEnabled
              ? t('Disable privacy mode')
              : t('Enable privacy mode')
          }
          aria-pressed={isPrivacyEnabled}
          onPress={() => setPrivacyPref(String(!isPrivacyEnabled))}
        >
          {isPrivacyEnabled ? (
            <SvgViewHide width={20} height={20} aria-hidden="true" />
          ) : (
            <SvgViewShow width={20} height={20} aria-hidden="true" />
          )}
        </Button>
        {rightContent}
      </View>
    </View>
  );
}

// On mobile the page header element stays mounted while navigating between
// pages so its background doesn't flash while the next page renders. Pages
// render their header into a single persistent `<MobilePageHeaderSlot />`
// (rendered by the app shell) through a portal. Without a provider (e.g. in
// tests or storybook) the header is rendered inline instead.
const MobilePageHeaderSlotContext = createContext<HTMLElement | null>(null);
const MobilePageHeaderSlotRefContext = createContext<
  ((element: HTMLElement | null) => void) | null
>(null);

export function MobilePageHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <MobilePageHeaderSlotRefContext.Provider value={setSlot}>
      <MobilePageHeaderSlotContext.Provider value={slot}>
        {children}
      </MobilePageHeaderSlotContext.Provider>
    </MobilePageHeaderSlotRefContext.Provider>
  );
}

type MobilePageHeaderSlotProps = {
  style?: CSSProperties;
};

export function MobilePageHeaderSlot({ style }: MobilePageHeaderSlotProps) {
  const slotRef = useContext(MobilePageHeaderSlotRefContext);
  return (
    <View
      ref={slotRef ?? undefined}
      style={{
        flexShrink: 0,
        minHeight: HEADER_HEIGHT,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        backgroundColor: theme.mobileHeaderBackground,
        ...style,
      }}
    />
  );
}

type PageProps = {
  header: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: number;
  children: ReactNode;
  footer?: ReactNode;
};

export function Page({
  header,
  className,
  style,
  padding,
  children,
  footer,
}: PageProps) {
  const { isNarrowWidth } = useResponsive();
  const mobileHeaderSlot = useContext(MobilePageHeaderSlotContext);
  const childrenPadding = padding != null ? padding : isNarrowWidth ? 10 : 20;

  const headerToRender =
    typeof header === 'string' ? (
      isNarrowWidth ? (
        <MobilePageHeader title={header} />
      ) : (
        <PageHeader title={header} />
      )
    ) : (
      header
    );

  const main = (
    <View
      role="main"
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowY: isNarrowWidth ? 'auto' : undefined,
        padding: `0 ${childrenPadding}px`,
      }}
    >
      {children}
    </View>
  );

  if (isNarrowWidth) {
    return (
      <View
        className={className}
        style={{
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
          ...style,
        }}
      >
        {mobileHeaderSlot
          ? createPortal(headerToRender, mobileHeaderSlot)
          : headerToRender}
        {main}
        {footer}
      </View>
    );
  }

  return (
    <View
      className={className}
      style={{
        ...styles.page,
        flex: 1,
        backgroundColor: theme.pageBackground,
        ...style,
      }}
    >
      {headerToRender}
      {main}
      {footer}
    </View>
  );
}
