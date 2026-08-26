import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('transaction_graph_edges')
@Index(['source_entity'])
@Index(['target_entity'])
@Index(['edge_type'])
export class TransactionGraphEdgeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  source_entity: string;

  @Column()
  target_entity: string;

  @Column()
  edge_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  weight: number;

  @Column({ nullable: true })
  transaction_count: number;

  @CreateDateColumn()
  first_seen: Date;

  @CreateDateColumn()
  last_seen: Date;
}