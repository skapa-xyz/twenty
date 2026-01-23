import { useQuery } from '@apollo/client';

import {
  XERO_CONNECTION_QUERY,
  XeroConnectionData,
} from '@/settings/integrations/graphql/queries/xeroConnectionQuery';

export const useXeroConnection = () => {
  const { data, loading, refetch } = useQuery<XeroConnectionData>(
    XERO_CONNECTION_QUERY,
    {
      fetchPolicy: 'network-only',
    },
  );

  return {
    connection: data?.xeroConnection ?? null,
    loading,
    refetch,
  };
};
