import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateBriefTable1769000000003 implements MigrationInterface {
  name = 'CreateBriefTable1769000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "core"."brief_priority_enum" AS ENUM ('high', 'medium', 'low');
    `);

    await queryRunner.query(`
      CREATE TABLE "core"."brief" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "buyerId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "minBudget" integer,
        "maxBudget" integer NOT NULL,
        "minBedrooms" integer,
        "minBathrooms" integer,
        "minCarSpaces" integer,
        "minLandSize" integer,
        "preferredSuburbs" jsonb NOT NULL DEFAULT '[]',
        "searchCenterPoint" geometry(Point, 4326),
        "searchRadiusKm" decimal(10,2),
        "propertyTypes" jsonb NOT NULL DEFAULT '[]',
        "mustHaveFeatures" jsonb NOT NULL DEFAULT '[]',
        "niceToHaveFeatures" jsonb NOT NULL DEFAULT '[]',
        "dealBreakers" jsonb NOT NULL DEFAULT '[]',
        "notes" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "priority" "core"."brief_priority_enum" NOT NULL DEFAULT 'medium',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_brief_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_BRIEF_WORKSPACE" ON "core"."brief" ("workspaceId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_BRIEF_BUYER" ON "core"."brief" ("buyerId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_BRIEF_ACTIVE" ON "core"."brief" ("isActive") WHERE "isActive" = true;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_BRIEF_SEARCH_CENTER_GIST"
      ON "core"."brief"
      USING GIST ("searchCenterPoint");
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."brief"
      ADD CONSTRAINT "FK_brief_workspace"
      FOREIGN KEY ("workspaceId")
      REFERENCES "core"."workspace"("id")
      ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "core"."brief"`);
    await queryRunner.query(`DROP TYPE "core"."brief_priority_enum"`);
  }
}
