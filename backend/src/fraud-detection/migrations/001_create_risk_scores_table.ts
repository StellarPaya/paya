import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRiskScoresTable1694000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'risk_scores',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'payment_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'overall_score',
            type: 'integer',
          },
          {
            name: 'risk_tier',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'factors',
            type: 'jsonb',
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'risk_scores',
      new TableIndex({
        name: 'idx_risk_scores_payment',
        columnNames: ['payment_id'],
      }),
    );

    await queryRunner.createIndex(
      'risk_scores',
      new TableIndex({
        name: 'idx_risk_scores_tier',
        columnNames: ['risk_tier'],
      }),
    );

    await queryRunner.createIndex(
      'risk_scores',
      new TableIndex({
        name: 'idx_risk_scores_created',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('risk_scores', 'idx_risk_scores_created');
    await queryRunner.dropIndex('risk_scores', 'idx_risk_scores_tier');
    await queryRunner.dropIndex('risk_scores', 'idx_risk_scores_payment');
    await queryRunner.dropTable('risk_scores');
  }
}