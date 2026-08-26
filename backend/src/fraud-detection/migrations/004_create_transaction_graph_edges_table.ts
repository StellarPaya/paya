import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTransactionGraphEdgesTable1694000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transaction_graph_edges',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'source_entity',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'target_entity',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'edge_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'transaction_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'first_seen',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'last_seen',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'transaction_graph_edges',
      new TableIndex({
        name: 'idx_graph_edges_source',
        columnNames: ['source_entity'],
      }),
    );

    await queryRunner.createIndex(
      'transaction_graph_edges',
      new TableIndex({
        name: 'idx_graph_edges_target',
        columnNames: ['target_entity'],
      }),
    );

    await queryRunner.createIndex(
      'transaction_graph_edges',
      new TableIndex({
        name: 'idx_graph_edges_type',
        columnNames: ['edge_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('transaction_graph_edges', 'idx_graph_edges_type');
    await queryRunner.dropIndex('transaction_graph_edges', 'idx_graph_edges_target');
    await queryRunner.dropIndex('transaction_graph_edges', 'idx_graph_edges_source');
    await queryRunner.dropTable('transaction_graph_edges');
  }
}