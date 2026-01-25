import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';

import { useXeroConnection } from '@/settings/integrations/hooks/useXeroConnection';
import { useTriggerXeroOAuth } from '@/settings/integrations/hooks/useTriggerXeroOAuth';
import { IconCheck, IconCurrencyDollar, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/layout';

const StyledCard = styled(Card)`
  width: 100%;
`;

const StyledCardContent = styled(CardContent)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};
`;

const StyledIconContainer = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.background.transparent.light};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  display: flex;
  height: ${({ theme }) => theme.spacing(10)};
  justify-content: center;
  width: ${({ theme }) => theme.spacing(10)};
`;

const StyledContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledTitle = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const StyledDescription = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledStatus = styled.div<{ isConnected: boolean }>`
  align-items: center;
  color: ${({ theme, isConnected }) =>
    isConnected ? theme.color.green : theme.font.color.tertiary};
  display: flex;
  font-size: ${({ theme }) => theme.font.size.sm};
  gap: ${({ theme }) => theme.spacing(1)};
`;

export const SettingsIntegrationsXeroCard = () => {
  const theme = useTheme();
  const { t } = useLingui();
  const { connection, loading, refetch } = useXeroConnection();
  const { triggerXeroOAuth, disconnectXero } = useTriggerXeroOAuth();

  const isConnected = connection?.isConnected ?? false;
  const tenantName = connection?.tenantName ?? 'Xero';

  const handleDisconnect = async () => {
    const success = await disconnectXero();
    if (success) {
      await refetch();
    }
  };

  return (
    <StyledCard rounded>
      <StyledCardContent>
        <StyledIconContainer>
          <IconCurrencyDollar
            size={theme.icon.size.lg}
            color={theme.font.color.primary}
          />
        </StyledIconContainer>
        <StyledContentContainer>
          <StyledTitle>{t`Xero`}</StyledTitle>
          <StyledDescription>
            {t`Connect your Xero account for accounting integration`}
          </StyledDescription>
          <StyledStatus isConnected={isConnected}>
            {isConnected ? (
              <>
                <IconCheck size={theme.icon.size.sm} />
                {t`Connected to ${tenantName}`}
              </>
            ) : (
              <>
                <IconX size={theme.icon.size.sm} />
                {t`Not connected`}
              </>
            )}
          </StyledStatus>
        </StyledContentContainer>
        {isConnected ? (
          <Button
            title={t`Disconnect`}
            variant="secondary"
            size="small"
            onClick={handleDisconnect}
            disabled={loading}
          />
        ) : (
          <Button
            title={t`Connect`}
            variant="primary"
            size="small"
            onClick={triggerXeroOAuth}
            disabled={loading}
          />
        )}
      </StyledCardContent>
    </StyledCard>
  );
};
