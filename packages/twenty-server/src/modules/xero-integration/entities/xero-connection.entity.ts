import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing Xero OAuth connection details with encrypted tokens.
 *
 * This entity maintains the OAuth credentials and metadata for integrating
 * with Xero's accounting platform. Tokens are stored in encrypted form to
 * ensure security of sensitive authentication data.
 *
 * Each workspace can have one Xero connection (enforced by unique index).
 */
@Entity({ name: 'xeroConnection', schema: 'core' })
@Index('IDX_XERO_CONNECTION_WORKSPACE', ['workspaceId'], { unique: true })
export class XeroConnectionEntity {
  /**
   * Unique identifier for the Xero connection
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the workspace this connection belongs to.
   * One workspace can have exactly one Xero connection.
   */
  @Column({ type: 'uuid' })
  workspaceId: string;

  /**
   * Xero organization/tenant ID.
   * This identifies the specific Xero organization the connection is linked to.
   */
  @Column({ type: 'varchar', nullable: true })
  tenantId: string | null;

  /**
   * Human-readable name of the Xero organization/tenant
   */
  @Column({ type: 'varchar', nullable: true })
  tenantName: string | null;

  /**
   * Encrypted OAuth 2.0 access token.
   * Used for authenticating API requests to Xero.
   * Encryption is handled by XeroTokenService using AES-256-GCM.
   */
  @Column({ type: 'text' })
  encryptedAccessToken: string;

  /**
   * Encrypted OAuth 2.0 refresh token.
   * Used to obtain new access tokens when they expire.
   * Encryption is handled by XeroTokenService using AES-256-GCM.
   */
  @Column({ type: 'text' })
  encryptedRefreshToken: string;

  /**
   * Timestamp when the access token expires.
   * Used to determine when token refresh is needed.
   */
  @Column({ type: 'timestamptz' })
  tokenExpiresAt: Date;

  /**
   * Timestamp of the last successful sync with Xero.
   * Null if no sync has occurred yet.
   */
  @Column({ type: 'timestamptz', nullable: true })
  lastSyncAt: Date | null;

  /**
   * Flag indicating whether this connection is currently active.
   * Inactive connections should not be used for API requests.
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * OAuth scopes granted for this connection.
   * Defines what permissions the integration has within Xero.
   * Stored as an array of scope strings (e.g., ['accounting.transactions', 'accounting.contacts']).
   */
  @Column({ type: 'varchar', array: true, default: '{}' })
  scopes: string[];

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
