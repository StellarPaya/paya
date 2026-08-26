import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('behavioral_profiles')
@Index(['last_updated'])
export class BehavioralProfileEntity {
  @PrimaryColumn()
  user_id: string;

  @Column({ type: 'jsonb' })
  profile_data: any;

  @Column({ type: 'jsonb' })
  baseline_data: any;

  @CreateDateColumn()
  last_updated: Date;
}