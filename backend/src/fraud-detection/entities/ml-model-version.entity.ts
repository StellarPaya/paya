import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('ml_model_versions')
@Unique(['model_name', 'version'])
export class MLModelVersionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  model_name: string;

  @Column()
  version: string;

  @Column()
  model_type: string;

  @Column()
  model_path: string;

  @Column({ type: 'jsonb' })
  features: any;

  @Column({ type: 'jsonb' })
  performance_metrics: any;

  @Column({ default: false })
  is_active: boolean;

  @CreateDateColumn()
  deployed_at: Date;
}