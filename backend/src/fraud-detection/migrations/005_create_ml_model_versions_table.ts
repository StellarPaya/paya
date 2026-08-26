import { MigrationInterface, QueryRunner, Table, TableUnique } from 'typeorm';

export class CreateMLModelVersionsTable1694000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ml_model_versions',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'model_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'model_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'model_path',
            type: 'text',
          },
          {
            name: 'features',
            type: 'jsonb',
          },
          {
            name: 'performance_metrics',
            type: 'jsonb',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deployed_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'ml_model_versions',
      new TableUnique({
        name: 'uq_ml_model_versions_name_version',
        columnNames: ['model_name', 'version'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('ml_model_versions', 'uq_ml_model_versions_name_version');
    await queryRunner.dropTable('ml_model_versions');
  }
}