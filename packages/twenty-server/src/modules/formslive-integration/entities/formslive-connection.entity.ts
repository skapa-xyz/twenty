import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Supported Australian states for FormsLive API routing.
 * Each state has its own FormsLive API endpoint.
 */
export type AustralianState =
  | 'QLD'
  | 'NSW'
  | 'VIC'
  | 'SA'
  | 'WA'
  | 'TAS'
  | 'NT'
  | 'ACT';

/**
 * Entity for storing FormsLive connection details with encrypted tokens.
 *
 * Unlike the Xero integration which is workspace-level, FormsLive connections
 * are per-user since each Buyers Agent has their own FormsLive account and
 * may operate in different Australian states.
 *
 * Key differences from XeroConnectionEntity:
 * - Indexed by (userId, workspaceId) instead of just workspaceId
 * - Stores australianState for API endpoint routing
 * - No refresh tokens (FormsLive uses simpler auth model)
 * - Stores selected engagement template ID for automation
 */
@Entity({ name: 'formsLiveConnection', schema: 'core' })
@Index('IDX_FORMSLIVE_CONNECTION_USER_WORKSPACE', ['userId', 'workspaceId'], {
  unique: true,
})
export class FormsLiveConnectionEntity {
  /**
   * Unique identifier for the FormsLive connection
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the workspace this connection belongs to.
   */
  @Column({ type: 'uuid' })
  workspaceId: string;

  /**
   * Reference to the user who owns this connection.
   * Each Buyers Agent has their own FormsLive account.
   */
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Australian state for API endpoint routing.
   * FormsLive maintains separate API endpoints per state:
   * - QLD: https://qld.api.formslive.com.au
   * - NSW: https://nsw.api.formslive.com.au
   * - etc.
   */
  @Column({ type: 'varchar', length: 10, default: 'QLD' })
  australianState: AustralianState;

  /**
   * Encrypted FormsLive access token.
   * Used for authenticating API requests.
   * Encryption is handled by FormsLiveTokenService using AES-256-GCM.
   */
  @Column({ type: 'text' })
  encryptedAccessToken: string;

  /**
   * FormsLive user ID returned from the API.
   * Used for webhook correlation and debugging.
   */
  @Column({ type: 'varchar', nullable: true })
  formsLiveUserId: string | null;

  /**
   * Agency name from FormsLive account.
   * Displayed in connection status UI.
   */
  @Column({ type: 'varchar', nullable: true })
  agencyName: string | null;

  /**
   * ID of the FormsLive template to use for engagement agreements.
   * User selects this during setup from their available templates.
   */
  @Column({ type: 'integer', nullable: true })
  engagementTemplateId: number | null;

  /**
   * Name of the selected engagement template.
   * Stored for display purposes without needing an API call.
   */
  @Column({ type: 'varchar', nullable: true })
  engagementTemplateName: string | null;

  /**
   * Flag indicating whether this connection is currently active.
   * Inactive connections should not be used for API requests.
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Registered webhook IDs from FormsLive.
   * Maps webhook types to their IDs for management.
   */
  @Column({ type: 'jsonb', nullable: true })
  webhookIds: Record<string, number> | null;

  /**
   * Timestamp when the connection was created
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Timestamp when the connection was last updated
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
