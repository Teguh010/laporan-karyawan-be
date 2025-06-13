import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResubmissionCount1749801800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE laporan 
      ADD COLUMN resubmission_count INTEGER DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE laporan 
      DROP COLUMN resubmission_count;
    `);
  }
}
