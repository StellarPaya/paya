import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('cross_chain_swaps')
@Index(['swap_id'])
@Index(['status'])
@Index(['source_chain', 'target_chain'])
export class SwapEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  swap_id: string;

  @Column()
  source_chain: string;

  @Column()
  target_chain: string;

  @Column()
  initiator_address: string;

  @Column()
  recipient_address: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  amount: number;

  @Column()
  asset: string;

  @Column()
  hash_lock: string;

  @Column()
  time_lock: number;

  @Column()
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  refunded_at: Date;
}