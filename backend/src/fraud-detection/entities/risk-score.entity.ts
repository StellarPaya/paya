import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('risk_scores')
@Index(['payment_id'])
@Index(['risk_tier'])
@Index(['created_at'])
export class RiskScoreEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  payment_id: string;

  @Column()
  overall_score: number;

  @Column()
  risk_tier: string;

  @Column({ type: 'jsonb' })
  factors: any;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidence: number;

  @CreateDateColumn()
  created_at: Date;
}