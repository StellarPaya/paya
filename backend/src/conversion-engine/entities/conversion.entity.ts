import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConversionStatus {
  PENDING = 'PENDING',
  PRICE_DISCOVERY = 'PRICE_DISCOVERY',
  EXECUTING = 'EXECUTING',
  BRIDGING = 'BRIDGING',
  SETTLING = 'SETTLING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum Chain {
  ETHEREUM = 'ETHEREUM',
  BSC = 'BSC',
  SOLANA = 'SOLANA',
  STELLAR = 'STELLAR',
}

export enum TokenType {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
}

export enum DexType {
  UNISWAP = 'UNISWAP',
  PANCAKESWAP = 'PANCAKESWAP',
  RAYDIUM = 'RAYDIUM',
  JUPITER = 'JUPITER',
}

export enum BridgeType {
  WORMHOLE = 'WORMHOLE',
  ALLBRIDGE = 'ALLBRIDGE',
  STARGAZE = 'STARGAZE',
}

@Entity('conversions')
export class Conversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  merchantId: string;

  @Column()
  sourceToken: TokenType;

  @Column()
  sourceChain: Chain;

  @Column('decimal', { precision: 36, scale: 18 })
  sourceAmount: number;

  @Column()
  targetToken: TokenType;

  @Column()
  targetChain: Chain;

  @Column('decimal', { precision: 36, scale: 18 })
  targetAmount: number;

  @Column('decimal', { precision: 36, scale: 18 })
  expectedAmount: number;

  @Column('decimal', { precision: 36, scale: 18 })
  slippageTolerance: number;

  @Column('decimal', { precision: 36, scale: 18 })
  actualSlippage: number;

  @Column()
  status: ConversionStatus;

  @Column({ nullable: true })
  dexType: DexType;

  @Column({ nullable: true })
  bridgeType: BridgeType;

  @Column({ type: 'json', nullable: true })
  priceData: any;

  @Column({ type: 'json', nullable: true })
  routeData: any;

  @Column({ type: 'json', nullable: true })
  transactionData: any;

  @Column({ type: 'json', nullable: true })
  bridgeData: any;

  @Column({ nullable: true })
  sourceTxHash: string;

  @Column({ nullable: true })
  bridgeTxHash: string;

  @Column({ nullable: true })
  settlementTxHash: string;

  @Column({ type: 'json', nullable: true })
  errorDetails: any;

  @Column('decimal', { precision: 36, scale: 18, default: 0 })
  feeAmount: number;

  @Column('decimal', { precision: 36, scale: 18, default: 0 })
  gasAmount: number;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
