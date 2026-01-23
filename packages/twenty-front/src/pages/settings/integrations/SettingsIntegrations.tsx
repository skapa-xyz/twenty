import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsIntegrationsXeroCard } from '@/settings/integrations/components/SettingsIntegrationsXeroCard';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';
import { Trans, useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { H2Title } from 'twenty-ui/display';
import { Section } from 'twenty-ui/layout';

export const SettingsIntegrations = () => {
  const { t } = useLingui();

  return (
    <SubMenuTopBarContainer
      title={t`Integrations`}
      links={[
        {
          children: <Trans>Workspace</Trans>,
          href: getSettingsPath(SettingsPath.Workspace),
        },
        { children: <Trans>Integrations</Trans> },
      ]}
    >
      <SettingsPageContainer>
        <Section>
          <H2Title
            title={t`Third-party integrations`}
            description={t`Connect external services to your workspace`}
          />
          <SettingsIntegrationsXeroCard />
        </Section>
      </SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
};
