# Conversion Engine Service

The Conversion Engine service handles BTC/ETH → USDC swaps via DEX integration, cross-chain bridging to Stellar, and final settlement to merchant vaults.

## Overview

The conversion engine provides a comprehensive solution for converting cryptocurrency assets across multiple chains with:

- **Real-time price discovery** from multiple sources (DEX aggregators, CEX, oracles)
- **Slippage protection** with dynamic tolerance calculation
- **Multi-DEX integration** (Uniswap, PancakeSwap, Raydium, Jupiter)
- **Cross-chain bridging** (Wormhole, Allbridge, Stargaze)
- **Stellar settlement** for final USDC deposits
- **Risk management** with position limits and circuit breakers
- **Comprehensive monitoring** and alerting

## Architecture

```
┌─────────────────┐
│   Controller    │
└────────┬────────┘
         │
┌────────▼────────┐
│ Conversion Svc  │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┬─────────┬─────────┐
    │         │         │         │         │         │
┌───▼───┐ ┌──▼────┐ ┌─▼──────┐ ┌▼───────┐ ┌▼──────┐ ┌▼──────┐
│ Price │ │Slippage│ │   DEX   │ │ Bridge │ │Stellar │ │  Risk  │
│Discovery│ │Protection│ │Integration│ │Integration│ │Settlement│ │Management│
└───────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## Supported Chains

- **Ethereum** (ETH, WBTC, USDC)
- **BSC** (BNB, BTCB, USDC)
- **Solana** (SOL, BTC, ETH, USDC)
- **Stellar** (XLM, USDC)

## Supported DEXs

- **Uniswap** (Ethereum)
- **PancakeSwap** (BSC)
- **Raydium** (Solana)
- **Jupiter** (Solana aggregator)

## Supported Bridges

- **Wormhole** (Multi-chain)
- **Allbridge** (Multi-chain)
- **Stargaze** (Cosmos ecosystem)

## Installation

The conversion engine is included in the main backend application. No additional installation is required.

## Configuration

Add the following environment variables to your `.env` file:

```env
# DEX API Keys
1INCH_API_KEY=your_1inch_api_key
ZEROX_API_KEY=your_0x_api_key

# Stellar Configuration
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
MERCHANT_VAULT_ADDRESS=GD5JQHFHKCVRXNSBBMUYNMIIMET3JRUJIK4T4ZLWIOJTAMY7RDC5U7XM
STELLAR_FEE=100

# Risk Management
VOLATILITY_THRESHOLD=0.05
MIN_SLIPPAGE_TOLERANCE=0.1
MAX_SLIPPAGE_TOLERANCE=5

# Chain Private Keys (Use secure key management in production)
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
BSC_PRIVATE_KEY=your_bsc_private_key
SOLANA_PRIVATE_KEY=your_solana_private_key
STELLAR_PRIVATE_KEY=your_stellar_private_key
```

## API Endpoints

### Create Conversion

```http
POST /conversion-engine/conversions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "merchantId": "uuid",
  "sourceToken": "BTC",
  "sourceChain": "ETHEREUM",
  "sourceAmount": 1.5,
  "targetToken": "USDC",
  "targetChain": "STELLAR",
  "slippageTolerance": 1.0,
  "preferredDexes": ["UNISWAP"],
  "preferredBridges": ["WORMHOLE"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "merchantId": "uuid",
  "sourceToken": "BTC",
  "sourceChain": "ETHEREUM",
  "sourceAmount": 1.5,
  "targetToken": "USDC",
  "targetChain": "STELLAR",
  "expectedAmount": 45000.00,
  "slippageTolerance": 1.0,
  "actualSlippage": 0,
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Execute Conversion

```http
POST /conversion-engine/conversions/:id/execute
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "targetAmount": 44850.00,
  "actualSlippage": 0.33,
  "sourceTxHash": "0x...",
  "bridgeTxHash": "0x...",
  "settlementTxHash": "hash...",
  "completedAt": "2024-01-01T00:05:00Z"
}
```

### Get Conversion

```http
GET /conversion-engine/conversions/:id
Authorization: Bearer <jwt_token>
```

### Get Merchant Conversions

```http
GET /conversion-engine/conversions/merchant/:merchantId
Authorization: Bearer <jwt_token>
```

### Cancel Conversion

```http
DELETE /conversion-engine/conversions/:id
Authorization: Bearer <jwt_token>
```

### Retry Failed Conversion

```http
POST /conversion-engine/conversions/:id/retry
Authorization: Bearer <jwt_token>
```

### Get Price Quote

```http
POST /conversion-engine/price-quote
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "sourceToken": "BTC",
  "sourceChain": "ETHEREUM",
  "targetToken": "USDC",
  "targetChain": "STELLAR",
  "amount": 1.0,
  "slippageTolerance": 1.0
}
```

### Get Metrics

```http
GET /conversion-engine/metrics
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "totalConversions": 1000,
  "successfulConversions": 950,
  "failedConversions": 30,
  "pendingConversions": 20,
  "averageSlippage": 0.45,
  "totalVolume": 5000000,
  "averageExecutionTime": 180000,
  "dexUsage": {
    "UNISWAP": 600,
    "PANCAKESWAP": 300,
    "JUPITER": 100
  },
  "bridgeUsage": {
    "WORMHOLE": 700,
    "ALLBRIDGE": 200,
    "STARGAZE": 100
  }
}
```

### Get Alerts

```http
GET /conversion-engine/alerts
Authorization: Bearer <jwt_token>
```

### Get Health Status

```http
GET /conversion-engine/health
Authorization: Bearer <jwt_token>
```

## Conversion Status Flow

```
PENDING → PRICE_DISCOVERY → EXECUTING → BRIDGING → SETTLING → COMPLETED
                                    ↓
                                  FAILED
```

## Risk Management

### Position Limits

- **Max Trade Size**: $100,000 per transaction
- **Daily Volume Limit**: $1,000,000 per merchant
- **Concentration Limit**: 50% per token

### Circuit Breakers

Circuit breakers are triggered automatically when:
- Volatility exceeds threshold (default: 5%)
- High slippage detected
- Multiple consecutive failures

Circuit breakers have a cooldown period (default: 5 minutes).

### Slippage Protection

- Dynamic slippage tolerance based on market conditions
- Minimum tolerance: 0.1%
- Maximum tolerance: 5%
- Risk assessment for high-slippage trades

## Error Handling

The service implements comprehensive error handling with:

- **Automatic retries** (max 3 attempts)
- **Exponential backoff** for retryable errors
- **Circuit breaker** activation for persistent failures
- **Detailed error logging** for debugging

## Monitoring

### Metrics Tracked

- Total conversions
- Success/failure rates
- Average slippage
- Total volume
- Average execution time
- DEX usage distribution
- Bridge usage distribution

### Alerts Generated

- **SLIPPAGE**: High slippage detected
- **FAILURE**: Conversion failed
- **DELAY**: Conversion taking too long
- **LIQUIDITY**: Low liquidity warning
- **VOLATILITY**: High volatility detected

## Security Considerations

### Key Management

- **Never commit private keys** to version control
- Use environment variables or secure key management (AWS KMS, HashiCorp Vault)
- Rotate keys regularly
- Use separate keys for each chain

### MEV Protection

- Flashbots integration for high-value trades
- Private mempool usage
- Max priority fee configuration

### Reentrancy Protection

- State checks before operations
- Nonce management
- Transaction monitoring

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## Deployment

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for caching)
- Stellar Horizon node access

### Steps

1. Set environment variables
2. Run database migrations
3. Build the application
4. Start the service

```bash
npm run build
npm run start:prod
```

## Troubleshooting

### Common Issues

**Conversion stuck in EXECUTING status**
- Check transaction status on blockchain explorer
- Verify gas price is sufficient
- Check DEX liquidity

**Bridge transaction failed**
- Verify bridge is operational
- Check bridge fees
- Ensure sufficient balance for fees

**High slippage**
- Increase slippage tolerance
- Check market volatility
- Consider splitting large trades

## Integration Examples

### Using with Payment Split

```typescript
// After payment split is completed, convert to USDC
const conversion = await conversionService.createConversion({
  merchantId: paymentSplit.merchantId,
  sourceToken: 'BTC',
  sourceChain: 'ETHEREUM',
  sourceAmount: paymentSplit.totalAmount,
  targetToken: 'USDC',
  targetChain: 'STELLAR',
  slippageTolerance: 1.0,
});

const result = await conversionService.executeConversion(conversion.id);
```

### Webhook Integration

```typescript
// Listen for conversion completion
webhookService.on('conversion.completed', async (data) => {
  await notificationService.sendMerchantNotification(data.merchantId, {
    type: 'CONVERSION_COMPLETED',
    amount: data.targetAmount,
    txHash: data.settlementTxHash,
  });
});
```

## Performance Optimization

- Price caching (30s TTL)
- Pool depth caching (1min TTL)
- Batch operations where possible
- Connection pooling for external APIs

## Future Enhancements

- Additional DEX integrations (Curve, Balancer)
- More bridge options (LayerZero, Celer)
- Advanced routing algorithms
- Machine learning for price prediction
- Multi-signature support for large transactions
- Gas optimization strategies

## Support

For issues or questions:
- Check the troubleshooting section
- Review logs for detailed error messages
- Contact the development team

## License

MIT
