import { gql } from '@apollo/client';

export const XERO_CONNECTION_QUERY = gql`
  query XeroConnection {
    xeroConnection {
      isConnected
      tenantName
      connectedAt
    }
  }
`;

export type XeroConnectionData = {
  xeroConnection: {
    isConnected: boolean;
    tenantName?: string;
    connectedAt?: string;
  } | null;
};
