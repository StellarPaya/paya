import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('event_store')
@Index(['streamId', 'streamVersion'], { unique: true })
@Index(['streamId'])
@Index(['createdAt'])
@Index(['eventType'])
export class EventStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  streamId: string;

  @Column({ type: 'bigint' })
  streamVersion: number;

  @Column({ type: 'varchar', length: 255 })
  eventType: string;

  @Column({ type: 'jsonb' })
  eventData: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'bigint' })
  position: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
