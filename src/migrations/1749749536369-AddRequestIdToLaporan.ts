import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestIdToLaporan1749749536369 implements MigrationInterface {
  name = 'AddRequestIdToLaporan1749749536369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "namaBarang"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "nomorBarang"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "noSurat"`);
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "requestId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "title" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "requestName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "companyCode" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "requestObjective" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "requestBackground" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "poType" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "assetType" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "totalAmountIdr" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "totalAmountOriginalCurrency" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "remarks" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "assignTo" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "requestDate" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "department" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "buyer" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "deliveryDate" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "currency" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "currency"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "deliveryDate"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "buyer"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "department"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "requestDate"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "assignTo"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "remarks"`);
    await queryRunner.query(
      `ALTER TABLE "laporan" DROP COLUMN "totalAmountOriginalCurrency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" DROP COLUMN "totalAmountIdr"`,
    );
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "assetType"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "poType"`);
    await queryRunner.query(
      `ALTER TABLE "laporan" DROP COLUMN "requestBackground"`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" DROP COLUMN "requestObjective"`,
    );
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "companyCode"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "requestName"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "laporan" DROP COLUMN "requestId"`);
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "noSurat" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "nomorBarang" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "laporan" ADD "namaBarang" character varying NOT NULL`,
    );
  }
}
