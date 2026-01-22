import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class EnablePostGIS1769000000001 implements MigrationInterface {
  name = 'EnablePostGIS1769000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Extensions typically not dropped in down migration
  }
}
