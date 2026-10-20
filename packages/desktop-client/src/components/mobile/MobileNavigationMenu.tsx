import { Trans, useTranslation } from 'react-i18next';

import { SvgCog, SvgReports, SvgWallet } from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useNavigate } from '#hooks/useNavigate';

export function MobileNavigationMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <MobileSheet name="mobile-navigation" title={t('More')}>
      {({ close }) => (
        <MobileSheetSection>
          <MobileSheetRow
            label={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <SvgWallet width={22} height={22} aria-hidden="true" />
                <Trans>Budget</Trans>
              </span>
            }
            onPress={() => {
              close();
              void navigate('/budget');
            }}
          />
          <MobileSheetRow
            label={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <SvgReports width={22} height={22} aria-hidden="true" />
                <Trans>Reports</Trans>
              </span>
            }
            onPress={() => {
              close();
              void navigate('/reports');
            }}
          />
          <MobileSheetRow
            label={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <SvgCalendar3 width={22} height={22} aria-hidden="true" />
                <Trans>Schedules</Trans>
              </span>
            }
            onPress={() => {
              close();
              void navigate('/schedules');
            }}
          />
          <MobileSheetRow
            label={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <SvgCog width={22} height={22} aria-hidden="true" />
                <Trans>Settings</Trans>
              </span>
            }
            onPress={() => {
              close();
              void navigate('/settings');
            }}
          />
        </MobileSheetSection>
      )}
    </MobileSheet>
  );
}
