import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Creates the FormsLive connection table for storing per-user FormsLive credentials.
 *
 * Unlike Xero which is workspace-level, FormsLive connections are per-user since
 * each Buyers Agent has their own FormsLive account and may operate in different
 * Australian states.
 */
export class CreateFormsLiveConnectionTable1769396139000
  implements MigrationInterface
{
  name = 'CreateFormsLiveConnectionTable1769396139000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "core"."formsLiveConnection" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "australianState" character varying(10) NOT NULL DEFAULT 'QLD',
        "encryptedAccessToken" text NOT NULL,
        "formsLiveUserId" character varying,
        "agencyName" character varying,
        "engagementTemplateId" integer,
        "engagementTemplateName" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "webhookIds" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_formsLiveConnection_id" PRIMARY KEY ("id")
      )
    `);

    // Create unique index on (userId, workspaceId) - each user can only have one connection per workspace
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_FORMSLIVE_CONNECTION_USER_WORKSPACE"
      ON "core"."formsLiveConnection" ("userId", "workspaceId")
    `);

    // Create index for workspace queries
    await queryRunner.query(`
      CREATE INDEX "IDX_FORMSLIVE_CONNECTION_WORKSPACE"
      ON "core"."formsLiveConnection" ("workspaceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "core"."IDX_FORMSLIVE_CONNECTION_WORKSPACE"`,
    );
    await queryRunner.query(
      `DROP INDEX "core"."IDX_FORMSLIVE_CONNECTION_USER_WORKSPACE"`,
    );
    await queryRunner.query(`DROP TABLE "core"."formsLiveConnection"`);
  }
}
