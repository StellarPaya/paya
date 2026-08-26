import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBridgeTransactionsTable1695000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bridge_transactions',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'transaction_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'chain',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'transaction_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'from_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'to_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 30,
            scale: 18,
          },
          {
            name: 'asset',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'confirmed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'bridge_transactions',
      new TableIndex({
        name: 'idx_bridge_tx_hash',
        columnNames: ['transaction_hash'],
      }),
    );

    await queryRunner.createIndex(
      'bridge_transactions',
      new TableIndex({
        name: 'idx_bridge_chain',
        columnNames: ['chain'],
      }),
    );

    await queryRunner.createIndex(
      'bridge_transactions',
      new TableIndex({
        name: 'idx_bridge_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('bridge_transactions', 'idx_bridge_status');
    await queryRunner.dropIndex('bridge_transactions', 'idx_bridge_chain');
    await queryRunner.dropIndex('bridge_transactions', 'idx_bridge_tx_hash');
    await queryRunner.dropTable('bridge_transactions');
  }
}