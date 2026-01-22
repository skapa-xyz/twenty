import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreatePropertyTable1769000000002 implements MigrationInterface {
  name = 'CreatePropertyTable1769000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create listing status enum
    await queryRunner.query(`
      CREATE TYPE "core"."property_listing_status_enum" AS ENUM (
        'on_market',
        'off_market',
        'pre_market',
        'sold',
        'withdrawn'
      );
    `);

    // Create property table with PostGIS geometry column
    await queryRunner.query(`
      CREATE TABLE "core"."property" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "addressDisplay" character varying(500) NOT NULL,
        "addressStreet" character varying(255),
        "addressSuburb" character varying(100),
        "addressState" character varying(50),
        "addressPostcode" character varying(10),
        "location" geometry(Point, 4326),
        "attributes" jsonb NOT NULL DEFAULT '{}',
        "listingStatus" "core"."property_listing_status_enum" NOT NULL DEFAULT 'off_market',
        "listingAgentId" uuid,
        "listingAgentName" character varying(255),
        "listingAgentPhone" character varying(50),
        "listingAgentEmail" character varying(255),
        "photos" jsonb NOT NULL DEFAULT '[]',
        "floorplanUrl" character varying(500),
        "estimatedValue" integer,
        "askingPrice" integer,
        "soldPrice" integer,
        "soldDate" date,
        "landSize" integer,
        "buildingSize" integer,
        "yearBuilt" integer,
        "notes" text,
        "searchVector" tsvector,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_property_id" PRIMARY KEY ("id")
      );
    `);

    // Create spatial index using GiST
    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_LOCATION_GIST"
      ON "core"."property"
      USING GIST ("location");
    `);

    // Create workspace index
    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_WORKSPACE"
      ON "core"."property" ("workspaceId");
    `);

    // Create GIN index on attributes JSONB for fast attribute queries
    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_ATTRIBUTES_GIN"
      ON "core"."property"
      USING GIN ("attributes");
    `);

    // Create trigram index on address for fuzzy search
    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_ADDRESS_TRGM"
      ON "core"."property"
      USING GIN ("addressDisplay" gin_trgm_ops);
    `);

    // Create full-text search index
    await queryRunner.query(`
      CREATE INDEX "IDX_PROPERTY_SEARCH_FTS"
      ON "core"."property"
      USING GIN ("searchVector");
    `);

    // Foreign key to workspace
    await queryRunner.query(`
      ALTER TABLE "core"."property"
      ADD CONSTRAINT "FK_property_workspace"
      FOREIGN KEY ("workspaceId")
      REFERENCES "core"."workspace"("id")
      ON DELETE CASCADE;
    `);

    // Trigger to auto-update searchVector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION core.property_search_vector_update()
      RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" :=
          setweight(to_tsvector('english', coalesce(NEW."addressDisplay", '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW."addressSuburb", '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW."notes", '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER property_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "core"."property"
      FOR EACH ROW
      EXECUTE FUNCTION core.property_search_vector_update();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS property_search_vector_trigger ON "core"."property"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS core.property_search_vector_update`);
    await queryRunner.query(`DROP TABLE "core"."property"`);
    await queryRunner.query(`DROP TYPE "core"."property_listing_status_enum"`);
  }
}
