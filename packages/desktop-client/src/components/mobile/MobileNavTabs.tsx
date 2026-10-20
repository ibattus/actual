import type { ComponentType, CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgAdd, SvgMenu, SvgPiggyBank } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useModalState } from '#hooks/useModalState';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export const MOBILE_NAV_HEIGHT =
  'calc(72px + env(safe-area-inset-bottom, 0px))';

const tabStyle: CSSProperties = {
  ...styles.noTapHighlight,
  flex: '1 1 0',
  minWidth: 0,
  minHeight: 64,
  boxSizing: 'border-box',
  padding: '6px 2px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  fontSize: 12,
  lineHeight: '16px',
  textAlign: 'center',
  textDecoration: 'none',
  userSelect: 'none',
  borderRadius: 12,
};

export function MobileNavTabs() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const { pathname } = useLocation();
  const { activeModal } = useModalState();
  const dispatch = useDispatch();
  const isMoreOpen = activeModal === 'mobile-navigation';
  const isMoreSelected =
    pathname === '/budget' ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname === '/schedules' ||
    pathname === '/notifications';

  if (!isNarrowWidth) {
    return null;
  }

  return (
    <nav
      aria-label={t('Main navigation')}
      data-navbar-state={isMoreOpen ? 'open' : 'default'}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: theme.mobileNavBackground,
        borderTop: `1px solid ${theme.menuBorder}`,
        boxSizing: 'border-box',
        height: MOBILE_NAV_HEIGHT,
        paddingTop: 3,
        paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(4px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(4px, env(safe-area-inset-right, 0px))',
        position: 'fixed',
        zIndex: 100,
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <NavTab name={t('Accounts')} path="/accounts" Icon={SvgPiggyBank} />
      <NavTab
        name={t('Add')}
        ariaLabel={t('Add transaction')}
        path="/transactions/new"
        Icon={SvgAdd}
        isPrimary
      />
      <Button
        variant="bare"
        aria-haspopup="dialog"
        aria-expanded={isMoreOpen}
        aria-current={isMoreSelected ? 'page' : undefined}
        className={css({
          '&[data-hovered], &[data-pressed]': {
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          },
          '&[data-focus-visible]': {
            outline: `2px solid ${theme.mobileNavItemSelected}`,
            outlineOffset: -2,
          },
        })}
        onPress={() =>
          dispatch(pushModal({ modal: { name: 'mobile-navigation' } }))
        }
        style={{
          ...tabStyle,
          backgroundColor: theme.mobileNavBackground,
          color:
            isMoreSelected || isMoreOpen
              ? theme.mobileNavItemSelected
              : theme.pageText,
          fontWeight: isMoreSelected || isMoreOpen ? 600 : 400,
        }}
      >
        <View style={{ height: 28, justifyContent: 'center' }}>
          <SvgMenu width={22} height={22} aria-hidden="true" />
        </View>
        <Trans>More</Trans>
      </Button>
    </nav>
  );
}

type NavTabProps = {
  name: string;
  ariaLabel?: string;
  path: string;
  Icon: ComponentType<{
    width: number;
    height: number;
    style?: CSSProperties;
  }>;
  isPrimary?: boolean;
};

function NavTab({
  Icon,
  name,
  ariaLabel,
  path,
  isPrimary = false,
}: NavTabProps) {
  return (
    <NavLink
      to={path}
      aria-label={ariaLabel}
      className={css({
        '&:hover, &:active': {
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.mobileNavItemSelected}`,
          outlineOffset: -2,
        },
      })}
      style={({ isActive }) => ({
        ...tabStyle,
        color: isActive ? theme.mobileNavItemSelected : theme.pageText,
        fontWeight: isActive ? 600 : 400,
      })}
    >
      <View
        aria-hidden="true"
        style={{
          width: 44,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          ...(isPrimary && {
            backgroundColor: theme.buttonPrimaryBackground,
            color: theme.buttonPrimaryText,
            borderRadius: 12,
          }),
        }}
      >
        <Icon width={22} height={22} />
      </View>
      <span
        style={{
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
    </NavLink>
  );
}
