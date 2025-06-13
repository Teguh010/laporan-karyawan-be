import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserApproved1686647717000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE laporan 
            ADD COLUMN user_approved BOOLEAN DEFAULT false;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE laporan 
            DROP COLUMN user_approved;
        `);
  }
}
