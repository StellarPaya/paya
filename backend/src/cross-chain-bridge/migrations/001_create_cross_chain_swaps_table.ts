import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCrossChainSwapsTable1695000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cross_chain_swaps',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'swap_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'source_chain',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'target_chain',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'initiator_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'recipient_address',
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
            name: 'hash_lock',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'time_lock',
            type: 'bigint',
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
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'refunded_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cross_chain_swaps',
      new TableIndex({
        name: 'idx_swaps_id',
        columnNames: ['swap_id'],
      }),
    );

    await queryRunner.createIndex(
      'cross_chain_swaps',
      new TableIndex({
        name: 'idx_swaps_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'cross_chain_swaps',
      new TableIndex({
        name: 'idx_swaps_chains',
        columnNames: ['source_chain', 'target_chain'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('cross_chain_swaps', 'idx_swaps_chains');
    await queryRunner.dropIndex('cross_chain_swaps', 'idx_swaps_status');
    await queryRunner.dropIndex('cross_chain_swaps', 'idx_swaps_id');
    await queryRunner.dropTable('cross_chain_swaps');
  }
}