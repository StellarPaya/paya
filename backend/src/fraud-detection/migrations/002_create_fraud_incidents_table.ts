import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFraudIncidentsTable1694000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fraud_incidents',
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
          },
          {
            name: 'fraud_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'evidence',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'detected_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'resolved_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'resolved_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'fraud_incidents',
      new TableIndex({
        name: 'idx_fraud_incidents_payment',
        columnNames: ['payment_id'],
      }),
    );

    await queryRunner.createIndex(
      'fraud_incidents',
      new TableIndex({
        name: 'idx_fraud_incidents_type',
        columnNames: ['fraud_type'],
      }),
    );

    await queryRunner.createIndex(
      'fraud_incidents',
      new TableIndex({
        name: 'idx_fraud_incidents_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('fraud_incidents', 'idx_fraud_incidents_status');
    await queryRunner.dropIndex('fraud_incidents', 'idx_fraud_incidents_type');
    await queryRunner.dropIndex('fraud_incidents', 'idx_fraud_incidents_payment');
    await queryRunner.dropTable('fraud_incidents');
  }
}