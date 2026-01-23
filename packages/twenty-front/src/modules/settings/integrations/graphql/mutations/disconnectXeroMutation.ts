import { gql } from '@apollo/client';

export const DISCONNECT_XERO_MUTATION = gql`
  mutation DisconnectXero {
    disconnectXero
  }
`;

export type DisconnectXeroResult = {
  disconnectXero: boolean;
};
