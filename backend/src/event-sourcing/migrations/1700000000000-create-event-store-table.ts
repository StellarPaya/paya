import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateEventStoreTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'event_store',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'stream_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'stream_version',
            type: 'bigint',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'event_data',
            type: 'jsonb',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'position',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint on stream_id and stream_version
    await queryRunner.createUniqueConstraint(
      'event_store',
      new TableUnique({
        name: 'UQ_event_store_stream_id_stream_version',
        columnNames: ['stream_id', 'stream_version'],
      }),
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'event_store',
      new TableIndex({
        name: 'IDX_event_store_stream_id',
        columnNames: ['stream_id'],
      }),
    );

    await queryRunner.createIndex(
      'event_store',
      new TableIndex({
        name: 'IDX_event_store_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'event_store',
      new TableIndex({
        name: 'IDX_event_store_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'event_store',
      new TableIndex({
        name: 'IDX_event_store_position',
        columnNames: ['position'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('event_store', 'IDX_event_store_position');
    await queryRunner.dropIndex('event_store', 'IDX_event_store_event_type');
    await queryRunner.dropIndex('event_store', 'IDX_event_store_created_at');
    await queryRunner.dropIndex('event_store', 'IDX_event_store_stream_id');
    await queryRunner.dropUniqueConstraint('event_store', 'UQ_event_store_stream_id_stream_version');
    await queryRunner.dropTable('event_store');
  }
}
