import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLiquidityPoolsTable1695000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'liquidity_pools',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'pool_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'chain',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'token_a',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'token_b',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'reserve_a',
            type: 'decimal',
            precision: 30,
            scale: 18,
          },
          {
            name: 'reserve_b',
            type: 'decimal',
            precision: 30,
            scale: 18,
          },
          {
            name: 'lp_token_supply',
            type: 'decimal',
            precision: 30,
            scale: 18,
          },
          {
            name: 'fee_rate',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'liquidity_pools',
      new TableIndex({
        name: 'idx_pools_chain',
        columnNames: ['chain'],
      }),
    );

    await queryRunner.createIndex(
      'liquidity_pools',
      new TableIndex({
        name: 'idx_pools_tokens',
        columnNames: ['token_a', 'token_b'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('liquidity_pools', 'idx_pools_tokens');
    await queryRunner.dropIndex('liquidity_pools', 'idx_pools_chain');
    await queryRunner.dropTable('liquidity_pools');
  }
}