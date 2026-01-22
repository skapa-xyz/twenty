import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class SetupRlsPolicies1769000000005 implements MigrationInterface {
  name = 'SetupRlsPolicies1769000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to get current workspace from session
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION core.current_workspace_id()
      RETURNS uuid AS $$
        SELECT NULLIF(current_setting('app.current_workspace_id', true), '')::uuid;
      $$ LANGUAGE sql STABLE;
    `);

    // Enable RLS on property table
    await queryRunner.query(`ALTER TABLE "core"."property" ENABLE ROW LEVEL SECURITY;`);

    await queryRunner.query(`
      CREATE POLICY "property_workspace_isolation" ON "core"."property"
        FOR ALL
        USING ("workspaceId" = core.current_workspace_id())
        WITH CHECK ("workspaceId" = core.current_workspace_id());
    `);

    // Enable RLS on brief table
    await queryRunner.query(`ALTER TABLE "core"."brief" ENABLE ROW LEVEL SECURITY;`);

    await queryRunner.query(`
      CREATE POLICY "brief_workspace_isolation" ON "core"."brief"
        FOR ALL
        USING ("workspaceId" = core.current_workspace_id())
        WITH CHECK ("workspaceId" = core.current_workspace_id());
    `);

    // Enable RLS on propertyMatch table
    await queryRunner.query(`ALTER TABLE "core"."propertyMatch" ENABLE ROW LEVEL SECURITY;`);

    await queryRunner.query(`
      CREATE POLICY "property_match_workspace_isolation" ON "core"."propertyMatch"
        FOR ALL
        USING ("workspaceId" = core.current_workspace_id())
        WITH CHECK ("workspaceId" = core.current_workspace_id());
    `);

    // Create bypass policy for service accounts (migrations, admin)
    await queryRunner.query(`
      CREATE POLICY "property_service_bypass" ON "core"."property"
        FOR ALL
        USING (current_setting('app.bypass_rls', true) = 'true');
    `);

    await queryRunner.query(`
      CREATE POLICY "brief_service_bypass" ON "core"."brief"
        FOR ALL
        USING (current_setting('app.bypass_rls', true) = 'true');
    `);

    await queryRunner.query(`
      CREATE POLICY "property_match_service_bypass" ON "core"."propertyMatch"
        FOR ALL
        USING (current_setting('app.bypass_rls', true) = 'true');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "property_service_bypass" ON "core"."property"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "property_workspace_isolation" ON "core"."property"`);
    await queryRunner.query(`ALTER TABLE "core"."property" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "brief_service_bypass" ON "core"."brief"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "brief_workspace_isolation" ON "core"."brief"`);
    await queryRunner.query(`ALTER TABLE "core"."brief" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "property_match_service_bypass" ON "core"."propertyMatch"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "property_match_workspace_isolation" ON "core"."propertyMatch"`);
    await queryRunner.query(`ALTER TABLE "core"."propertyMatch" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS core.current_workspace_id`);
  }
}
