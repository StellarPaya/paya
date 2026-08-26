import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('fraud_incidents')
@Index(['payment_id'])
@Index(['fraud_type'])
@Index(['status'])
export class FraudIncidentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  payment_id: string;

  @Column()
  fraud_type: string;

  @Column()
  severity: string;

  @Column()
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @CreateDateColumn()
  detected_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date;

  @Column({ nullable: true })
  resolved_by: string;
}