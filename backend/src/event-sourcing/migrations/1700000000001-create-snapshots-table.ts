import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSnapshotsTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'snapshots',
        columns: [
          {
            name: 'stream_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'stream_version',
            type: 'bigint',
          },
          {
            name: 'snapshot_data',
            type: 'jsonb',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('snapshots');
  }
}
