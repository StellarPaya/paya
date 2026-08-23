import { ConversionStatus, Chain, TokenType, DexType, BridgeType } from '../entities/conversion.entity';

export class ConversionResponseDto {
  id: string;
  merchantId: string;
  sourceToken: TokenType;
  sourceChain: Chain;
  sourceAmount: number;
  targetToken: TokenType;
  targetChain: Chain;
  targetAmount: number;
  expectedAmount: number;
  slippageTolerance: number;
  actualSlippage: number;
  status: ConversionStatus;
  dexType: DexType;
  bridgeType: BridgeType;
  priceData: any;
  routeData: any;
  transactionData: any;
  bridgeData: any;
  sourceTxHash: string;
  bridgeTxHash: string;
  settlementTxHash: string;
  feeAmount: number;
  gasAmount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date;
}
