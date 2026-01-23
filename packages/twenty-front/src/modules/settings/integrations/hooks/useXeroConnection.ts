import { useQuery } from '@apollo/client';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import {
  XERO_CONNECTION_QUERY,
  type XeroConnectionData,
} from '@/settings/integrations/graphql/queries/xeroConnectionQuery';

export const useXeroConnection = () => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error, refetch } = useQuery<XeroConnectionData>(
    XERO_CONNECTION_QUERY,
    {
      client: apolloCoreClient,
      fetchPolicy: 'network-only',
    },
  );

  return {
    connection: data?.xeroConnection ?? null,
    loading,
    error,
    refetch,
  };
};
