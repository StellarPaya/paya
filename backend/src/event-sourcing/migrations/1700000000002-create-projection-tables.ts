import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProjectionTables1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Payment analytics projection
    await queryRunner.createTable(
      new Table({
        name: 'payment_analytics',
        columns: [
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'total_payments',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'successful_payments',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'failed_payments',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'pending_payments',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'last_payment_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Daily payment metrics projection
    await queryRunner.createTable(
      new Table({
        name: 'daily_payment_metrics',
        columns: [
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'payment_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'successful_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'failed_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'avg_amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create primary key for daily_payment_metrics
    await queryRunner.createPrimaryKey(
      'daily_payment_metrics',
      ['merchant_id', 'date'],
    );

    // Subscription analytics projection
    await queryRunner.createTable(
      new Table({
        name: 'subscription_analytics',
        columns: [
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'total_subscriptions',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'active_subscriptions',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'trialing_subscriptions',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'past_due_subscriptions',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'cancelled_subscriptions',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'monthly_recurring_revenue',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Split analytics projection
    await queryRunner.createTable(
      new Table({
        name: 'split_analytics',
        columns: [
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'total_splits',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'completed_splits',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'failed_splits',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'total_split_amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Refund analytics projection
    await queryRunner.createTable(
      new Table({
        name: 'refund_analytics',
        columns: [
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'total_refunds',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'total_refund_amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'completed_refunds',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'failed_refunds',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'total_fees',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Real-time monitoring projection
    await queryRunner.createTable(
      new Table({
        name: 'realtime_monitoring',
        columns: [
          {
            name: 'payment_id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'daily_payment_metrics',
      new TableIndex({
        name: 'IDX_daily_payment_metrics_date',
        columnNames: ['date'],
      }),
    );

    await queryRunner.createIndex(
      'realtime_monitoring',
      new TableIndex({
        name: 'IDX_realtime_monitoring_merchant_id',
        columnNames: ['merchant_id'],
      }),
    );

    await queryRunner.createIndex(
      'realtime_monitoring',
      new TableIndex({
        name: 'IDX_realtime_monitoring_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('realtime_monitoring', 'IDX_realtime_monitoring_status');
    await queryRunner.dropIndex('realtime_monitoring', 'IDX_realtime_monitoring_merchant_id');
    await queryRunner.dropIndex('daily_payment_metrics', 'IDX_daily_payment_metrics_date');
    await queryRunner.dropTable('realtime_monitoring');
    await queryRunner.dropTable('refund_analytics');
    await queryRunner.dropTable('split_analytics');
    await queryRunner.dropTable('subscription_analytics');
    await queryRunner.dropTable('daily_payment_metrics');
    await queryRunner.dropTable('payment_analytics');
  }
}
