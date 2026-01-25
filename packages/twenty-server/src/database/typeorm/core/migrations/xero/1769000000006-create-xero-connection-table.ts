import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateXeroConnectionTable1769000000006
  implements MigrationInterface
{
  name = 'CreateXeroConnectionTable1769000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "core"."xeroConnection" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "tenantId" character varying(255),
        "tenantName" character varying(255),
        "encryptedAccessToken" text NOT NULL,
        "encryptedRefreshToken" text NOT NULL,
        "tokenExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "lastSyncAt" TIMESTAMP WITH TIME ZONE,
        "scopes" character varying[] NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_xero_connection_id" PRIMARY KEY ("id")
      );
    `);

    // Create unique index on workspaceId (one Xero connection per workspace)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_XERO_CONNECTION_WORKSPACE"
      ON "core"."xeroConnection" ("workspaceId");
    `);

    // Foreign key to workspace with CASCADE delete
    await queryRunner.query(`
      ALTER TABLE "core"."xeroConnection"
      ADD CONSTRAINT "FK_xero_connection_workspace"
      FOREIGN KEY ("workspaceId")
      REFERENCES "core"."workspace"("id")
      ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "core"."xeroConnection"`);
  }
}
