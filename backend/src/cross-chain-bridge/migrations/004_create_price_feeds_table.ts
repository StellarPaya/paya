import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePriceFeedsTable1695000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'price_feeds',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'base_asset',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'quote_asset',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 30,
            scale: 18,
          },
          {
            name: 'chain',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'source',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'timestamp',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'price_feeds',
      new TableIndex({
        name: 'idx_price_assets',
        columnNames: ['base_asset', 'quote_asset'],
      }),
    );

    await queryRunner.createIndex(
      'price_feeds',
      new TableIndex({
        name: 'idx_price_chain',
        columnNames: ['chain'],
      }),
    );

    await queryRunner.createIndex(
      'price_feeds',
      new TableIndex({
        name: 'idx_price_timestamp',
        columnNames: ['timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('price_feeds', 'idx_price_timestamp');
    await queryRunner.dropIndex('price_feeds', 'idx_price_chain');
    await queryRunner.dropIndex('price_feeds', 'idx_price_assets');
    await queryRunner.dropTable('price_feeds');
  }
}