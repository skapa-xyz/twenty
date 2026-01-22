import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreatePropertyMatchTable1769000000004 implements MigrationInterface {
  name = 'CreatePropertyMatchTable1769000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "core"."property_match_status_enum" AS ENUM (
        'new',
        'viewed',
        'shortlisted',
        'rejected',
        'expired'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "core"."propertyMatch" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "propertyId" uuid NOT NULL,
        "briefId" uuid NOT NULL,
        "buyerId" uuid NOT NULL,
        "matchScore" integer NOT NULL,
        "scoreBreakdown" jsonb NOT NULL DEFAULT '{}',
        "status" "core"."property_match_status_enum" NOT NULL DEFAULT 'new',
        "agentNotes" text,
        "viewedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_property_match_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_property_brief" UNIQUE ("propertyId", "briefId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_MATCH_WORKSPACE" ON "core"."propertyMatch" ("workspaceId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_MATCH_PROPERTY" ON "core"."propertyMatch" ("propertyId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_MATCH_BRIEF" ON "core"."propertyMatch" ("briefId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_MATCH_SCORE" ON "core"."propertyMatch" ("matchScore" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_MATCH_STATUS" ON "core"."propertyMatch" ("status");
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."propertyMatch"
      ADD CONSTRAINT "FK_property_match_workspace"
      FOREIGN KEY ("workspaceId")
      REFERENCES "core"."workspace"("id")
      ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."propertyMatch"
      ADD CONSTRAINT "FK_property_match_property"
      FOREIGN KEY ("propertyId")
      REFERENCES "core"."property"("id")
      ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."propertyMatch"
      ADD CONSTRAINT "FK_property_match_brief"
      FOREIGN KEY ("briefId")
      REFERENCES "core"."brief"("id")
      ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "core"."propertyMatch"`);
    await queryRunner.query(`DROP TYPE "core"."property_match_status_enum"`);
  }
}
