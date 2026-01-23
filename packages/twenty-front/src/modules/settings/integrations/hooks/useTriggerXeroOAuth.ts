import { useMutation } from '@apollo/client';
import { useRecoilValue } from 'recoil';

import {
  DISCONNECT_XERO_MUTATION,
  DisconnectXeroResult,
} from '@/settings/integrations/graphql/mutations/disconnectXeroMutation';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

export const useTriggerXeroOAuth = () => {
  const [disconnectXeroMutation] = useMutation<DisconnectXeroResult>(
    DISCONNECT_XERO_MUTATION,
  );
  const tokenPair = useRecoilValue(tokenPairState);

  const triggerXeroOAuth = () => {
    // Pass token as query parameter since browser redirects can't include headers
    const token = tokenPair?.accessOrWorkspaceAgnosticToken?.token;

    if (!token) {
      // eslint-disable-next-line no-console
      console.error('No access token available for Xero OAuth');

      return;
    }

    window.location.href = `${REACT_APP_SERVER_BASE_URL}/api/auth/xero?token=${encodeURIComponent(token)}`;
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
