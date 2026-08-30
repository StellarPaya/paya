import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('snapshots')
export class Snapshot {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  streamId: string;

  @Column({ type: 'bigint' })
  streamVersion: number;

  @Column({ type: 'jsonb' })
  snapshotData: any;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
