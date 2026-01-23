import { useMutation } from '@apollo/client';

import {
  DISCONNECT_XERO_MUTATION,
  DisconnectXeroResult,
} from '@/settings/integrations/graphql/mutations/disconnectXeroMutation';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

export const useTriggerXeroOAuth = () => {
  const [disconnectXeroMutation] = useMutation<DisconnectXeroResult>(
    DISCONNECT_XERO_MUTATION,
  );

  const triggerXeroOAuth = () => {
    // Redirect to backend OAuth endpoint
    // The backend will handle the OAuth flow and redirect back to /settings/integrations
    window.location.href = `${REACT_APP_SERVER_BASE_URL}/api/auth/xero`;
  };

  const disconnectXero = async () => {
    try {
      await disconnectXeroMutation();
      return true;
    } catch {
      return false;
    }
  };

  return { triggerXeroOAuth, disconnectXero };
};
