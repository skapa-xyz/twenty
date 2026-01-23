import { ObjectType, Field } from '@nestjs/graphql';

/**
 * GraphQL type representing the Xero connection status for a workspace.
 * This is used to display the connection state in the Settings → Integrations page.
 */
@ObjectType('XeroConnectionStatus')
export class XeroConnectionStatus {
  @Field(() => Boolean, { description: 'Whether the Xero integration is connected and active' })
  isConnected: boolean;

  @Field(() => String, { nullable: true, description: 'Name of the connected Xero organization/tenant' })
  tenantName?: string;

  @Field(() => Date, { nullable: true, description: 'When the connection was established' })
  connectedAt?: Date;
}
