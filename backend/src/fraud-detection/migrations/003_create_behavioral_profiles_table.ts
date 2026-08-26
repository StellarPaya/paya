import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBehavioralProfilesTable1694000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'behavioral_profiles',
        columns: [
          {
            name: 'user_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'profile_data',
            type: 'jsonb',
          },
          {
            name: 'baseline_data',
            type: 'jsonb',
          },
          {
            name: 'last_updated',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'behavioral_profiles',
      new TableIndex({
        name: 'idx_behavioral_profiles_updated',
        columnNames: ['last_updated'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('behavioral_profiles', 'idx_behavioral_profiles_updated');
    await queryRunner.dropTable('behavioral_profiles');
  }
}