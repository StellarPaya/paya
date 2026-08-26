import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('price_feeds')
@Index(['base_asset', 'quote_asset'])
@Index(['chain'])
@Index(['timestamp'])
export class PriceFeedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  base_asset: string;

  @Column()
  quote_asset: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  price: number;

  @Column()
  chain: string;

  @Column()
  source: string;

  @CreateDateColumn()
  timestamp: Date;
}