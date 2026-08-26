# Cross-Chain Payment Bridge with Atomic Swaps

## Overview

The Paya Cross-Chain Bridge enables trustless transfers between multiple blockchain networks using atomic swap protocols. This system allows merchants to accept payments from different blockchains (Stellar, Ethereum, Polygon, etc.) with automatic settlement and liquidity management.

## Architecture

The cross-chain bridge consists of five main components:

1. **Atomic Swap Contracts** - Hashed Timelock Contracts (HTLC) for trustless cross-chain swaps
2. **Bridge Contracts** - Network-specific bridge contracts for each supported blockchain
3. **Liquidity Pool System** - AMM-based liquidity management for efficient swaps
4. **Cross-Chain Relayer Service** - Monitors and relays swap events between chains
5. **Price Oracle Service** - Multi-source price feeds for accurate conversions
6. **Unified Settlement Layer** - Aggregates and settles cross-chain payments efficiently

## Components

### 1. Atomic Swap Protocol

**Location:** `smartcontracts/contracts/atomic_swap_contract/src/lib.rs`

The atomic swap contract implements Hashed Timelock Contracts (HTLC) for trustless cross-chain transfers.

#### Key Features

- **Hash Locks**: SHA-256 hash of secret ensures only intended recipient can claim
- **Time Locks**: Timeout mechanism for refunds if swap isn't completed
- **Fee Management**: Configurable fee structure for swap operations
- **Emergency Controls**: Pause/unpause functionality for admin

#### Protocol Flow

1. **Initiation**: Swap creator locks funds with hash lock and time lock
2. **Claim**: Recipient reveals secret to claim funds on target chain
3. **Refund**: If time expires, initiator can refund the locked funds
4. **Atomicity**: Either claim or refund executes, never both

#### Contract Functions

```rust
initialize(env, admin, fee_basis_points) - Initialize contract
initiate_swap(env, swap_id, initiator, recipient, amount, asset, hash_lock, time_lock, target_chain, target_address) - Create new swap
complete_swap(env, swap_id, secret) - Claim swap with secret
refund_swap(env, swap_id) - Refund after timeout
get_swap(env, swap_id) - Get swap details
set_fee(env, admin, fee_basis_points) - Update fee
pause(env, admin) - Emergency pause
unpause(env, admin) - Resume operations
is_paused(env) - Check pause status
```

#### Gas Costs

- `initiate_swap`: ~25,000 gas
- `complete_swap`: ~20,000 gas
- `refund_swap`: ~15,000 gas
- `get_swap`: ~5,000 gas

### 2. Bridge Contracts

#### Ethereum Bridge

**Location:** `smartcontracts/ethereum-bridge/contracts/EthereumBridge.sol`

Ethereum-compatible bridge contract with full HTLC support.

**Features:**
- ERC-20 token support
- Native ETH support
- Reentrancy protection
- Pausable for emergencies
- Fee management

**Key Functions:**
```solidity
initiateSwap(swapId, recipient, amount, token, hashLock, timeLock, targetChain, targetAddress)
completeSwap(swapId, secret)
refundSwap(swapId)
addSupportedToken(token)
removeSupportedToken(token)
setFeeBasisPoints(feeBasisPoints)
withdrawFees(token, amount)
```

#### Polygon Bridge

**Location:** `smartcontracts/ethereum-bridge/contracts/PolygonBridge.sol`

Optimized version for Polygon network with lower fees due to cheaper transactions.

**Polygon-Specific Features:**
- Lower maximum fee (5% vs 10% on Ethereum)
- Optimized for fast confirmations
- Lower gas cost operations

### 3. Liquidity Pool System

**Location:** `smartcontracts/contracts/liquidity_pool_contract/src/lib.rs`

AMM-based liquidity management following the constant product formula (x * y = k).

#### Key Features

- **Automated Market Making**: Constant product formula for price discovery
- **LP Tokens**: Liquidity providers receive LP tokens representing their share
- **Dynamic Fees**: Adjustable fee rates based on liquidity depth
- **Flash Loan Protection**: Mechanisms to prevent drain attacks
- **Slippage Protection**: Minimum output amounts for swaps

#### Pool Operations

```rust
add_liquidity(env, provider, token_a, amount_a, token_b, amount_b) - Add liquidity
remove_liquidity(env, provider, token_a, token_b, lp_token_amount) - Remove liquidity
swap(env, token_in, amount_in, token_out, min_amount_out) - Execute swap
get_reserves(env, token_a, token_b) - Get pool reserves
get_lp_balance(env, provider) - Get LP token balance
```

#### AMM Formula

```
amount_out = (amount_in * reserve_out) / (reserve_in + amount_in) * (1 - fee)
```

### 4. Cross-Chain Relayer Service

**Location:** `backend/src/cross-chain-bridge/cross-chain-relayer.service.ts`

Monitors blockchain events and relays swap completions/refunds between chains.

#### Key Features

- **Event Monitoring**: Listens for swap initiation events across all chains
- **Automatic Relaying**: Automatically relays swap completions to target chains
- **Retry Logic**: Handles failed relays with exponential backoff
- **Signature Verification**: Validates cross-chain signatures
- **Multi-Chain Support**: Configurable for different blockchain networks

#### API Endpoints

```typescript
POST /cross-chain-bridge/relayer/start-monitoring - Start monitoring
POST /cross-chain-bridge/relayer/stop-monitoring - Stop monitoring
POST /cross-chain-bridge/relayer/relay-completion - Relay swap completion
POST /cross-chain-bridge/relayer/relay-refund - Relay swap refund
POST /cross-chain-bridge/relayer/verify-signature - Verify signature
POST /cross-chain-bridge/relayer/handle-failed-relay/:swapId - Handle failed relay
GET /cross-chain-bridge/relayer/monitoring-status - Get monitoring status
```

#### Chain Configuration

```typescript
{
  stellar: {
    rpcUrl: "https://horizon-testnet.stellar.org",
    contractAddress: "stellar_contract_address",
    privateKey: "stellar_private_key",
    confirmations: 1
  },
  ethereum: {
    rpcUrl: "https://eth-rpc.example.com",
    contractAddress: "ethereum_contract_address",
    privateKey: "ethereum_private_key",
    confirmations: 12
  },
  polygon: {
    rpcUrl: "https://polygon-rpc.example.com",
    contractAddress: "polygon_contract_address",
    privateKey: "polygon_private_key",
    confirmations: 10
  }
}
```

### 5. Price Oracle Service

**Location:** `backend/src/cross-chain-bridge/price-oracle.service.ts`

Multi-source price oracle for accurate cross-chain asset conversions.

#### Key Features

- **Multiple Sources**: Chainlink, CoinGecko, CoinMarketCap
- **Aggregation**: Weighted average of multiple oracle sources
- **TWAP Calculation**: Time-Weighted Average Price for manipulation resistance
- **Deviation Detection**: Alerts on significant price movements
- **Caching**: 30-second cache for performance
- **Fallback**: Automatic source switching on failures

#### API Endpoints

```typescript
GET /cross-chain-bridge/price-oracle/price - Get current price
GET /cross-chain-bridge/price-oracle/twap - Get TWAP price
GET /cross-chain-bridge/price-oracle/check-deviation - Check price deviation
POST /cross-chain-bridge/price-oracle/update-feeds - Update price feeds
GET /cross-chain-bridge/price-oracle/historical - Get historical prices
GET /cross-chain-bridge/price-oracle/oracle-status - Get oracle status
POST /cross-chain-bridge/price-oracle/toggle-oracle - Enable/disable oracle
```

#### Supported Assets

- **Major Pairs**: BTC/USD, ETH/USD, XLM/USD, MATIC/USD, USDC/USD
- **Custom Pairs**: Any ERC-20 or SPL token pair
- **Real-time Updates**: Every 30 seconds

### 6. Unified Settlement Service

**Location:** `backend/src/cross-chain-bridge/unified-settlement.service.ts`

Aggregates cross-chain payments for efficient settlement with netting.

#### Key Features

- **Payment Aggregation**: Groups payments by time windows
- **Netting**: Reduces settlement costs through offsetting transactions
- **Multi-Signature Approval**: Governance for settlement execution
- **Dispute Resolution**: Handles settlement disputes
- **Regulatory Compliance**: KYC/AML checks and reporting
- **Audit Trail**: Complete settlement history

#### API Endpoints

```typescript
POST /cross-chain-bridge/settlement/aggregate - Aggregate payments
POST /cross-chain-bridge/settlement/netting/:batchId - Apply netting
POST /cross-chain-bridge/settlement/submit-approval/:batchId - Submit for approval
POST /cross-chain-bridge/settlement/approve/:batchId - Approve settlement
GET /cross-chain-bridge/settlement/batch/:batchId - Get batch details
GET /cross-chain-bridge/settlement/batches - Get all batches
POST /cross-chain-bridge/settlement/dispute/:batchId - File dispute
GET /cross-chain-bridge/settlement/statistics - Get statistics
GET /cross-chain-bridge/settlement/audit-trail/:batchId - Get audit trail
GET /cross-chain-bridge/settlement/compliance/:batchId - Check compliance
```

#### Settlement Flow

1. **Aggregation**: Group completed swaps by time window
2. **Netting**: Calculate net amounts for each recipient/chain
3. **Approval**: Multi-signature approval process
4. **Execution**: Execute netted settlements
5. **Audit**: Record complete audit trail

## Database Schema

### Cross-Chain Swaps Table

```sql
CREATE TABLE cross_chain_swaps (
  id BIGSERIAL PRIMARY KEY,
  swap_id VARCHAR(255) UNIQUE NOT NULL,
  source_chain VARCHAR(50) NOT NULL,
  target_chain VARCHAR(50) NOT NULL,
  initiator_address VARCHAR(255) NOT NULL,
  recipient_address VARCHAR(255) NOT NULL,
  amount DECIMAL(30, 18) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  hash_lock VARCHAR(255) NOT NULL,
  time_lock BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);
```

### Liquidity Pools Table

```sql
CREATE TABLE liquidity_pools (
  id BIGSERIAL PRIMARY KEY,
  pool_id VARCHAR(255) UNIQUE NOT NULL,
  chain VARCHAR(50) NOT NULL,
  token_a VARCHAR(100) NOT NULL,
  token_b VARCHAR(100) NOT NULL,
  reserve_a DECIMAL(30, 18) NOT NULL,
  reserve_b DECIMAL(30, 18) NOT NULL,
  lp_token_supply DECIMAL(30, 18) NOT NULL,
  fee_rate DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Bridge Transactions Table

```sql
CREATE TABLE bridge_transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_hash VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  amount DECIMAL(30, 18) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE
);
```

### Price Feeds Table

```sql
CREATE TABLE price_feeds (
  id BIGSERIAL PRIMARY KEY,
  base_asset VARCHAR(100) NOT NULL,
  quote_asset VARCHAR(100) NOT NULL,
  price DECIMAL(30, 18) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  source VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## Installation and Setup

### Prerequisites

- Node.js >= 18
- Rust stable toolchain
- Soroban CLI
- Hardhat (for Ethereum/Polygon contracts)
- PostgreSQL database

### Smart Contracts

#### Stellar Contracts

```bash
cd smartcontracts/contracts/atomic_swap_contract
cargo build --target wasm32-unknown-unknown --release
```

#### Ethereum/Polygon Contracts

```bash
cd smartcontracts/ethereum-bridge
npm install
npx hardhat compile
```

### Backend Services

```bash
cd backend
pnpm install
# Add environment variables for each chain
pnpm start:dev
```

### Environment Variables

```env
# Stellar
STELLAR_RPC_URL=https://horizon-testnet.stellar.org
STELLAR_CONTRACT_ADDRESS=your_contract_address
STELLAR_PRIVATE_KEY=your_private_key

# Ethereum
ETHEREUM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your_key
ETHEREUM_CONTRACT_ADDRESS=your_contract_address
ETHEREUM_PRIVATE_KEY=your_private_key

# Polygon
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your_key
POLYGON_CONTRACT_ADDRESS=your_contract_address
POLYGON_PRIVATE_KEY=your_private_key

# Price Oracles
CHAINLINK_API_URL=https://feeds.chain.link
CHAINLINK_API_KEY=your_api_key
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINMARKETCAP_API_URL=https://pro-api.coinmarketcap.com
COINMARKETCAP_API_KEY=your_api_key

# Settlement
SETTLEMENT_REQUIRED_APPROVALS=2
```

## Usage Examples

### Initiate Cross-Chain Swap

```typescript
const swap = await fetch('http://localhost:3000/cross-chain-bridge/atomic-swap/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    swapId: 'swap_123',
    initiator: 'GABC...XYZ',
    recipient: '0x123...abc',
    amount: 1000,
    asset: 'XLM',
    hashLock: '0xabc123...',
    timeLock: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    targetChain: 'ethereum',
    targetAddress: '0x456...def'
  })
});
```

### Get Price for Asset Pair

```typescript
const price = await fetch(
  `http://localhost:3000/cross-chain-bridge/price-oracle/price?baseAsset=BTC&quoteAsset=USD&chain=global`
).then(r => r.json());

console.log(`BTC/USD Price: ${price.price}`);
```

### Monitor Cross-Chain Swaps

```typescript
// Start monitoring
await fetch('http://localhost:3000/cross-chain-bridge/relayer/start-monitoring', {
  method: 'POST'
});

// Check status
const status = await fetch('http://localhost:3000/cross-chain-bridge/relayer/monitoring-status')
  .then(r => r.json());
```

### Add Liquidity to Pool

```typescript
const result = await stellarContract.call(
  'add_liquidity',
  ...[
    providerAddress,
    tokenAAddress,
    amountA,
    tokenBAddress,
    amountB
  ]
);
```

### Aggregate Settlement

```typescript
const batch = await fetch('http://localhost:3000/cross-chain-bridge/settlement/aggregate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    startDate: new Date(Date.now() - 86400000), // 24 hours ago
    endDate: new Date()
  })
}).then(r => r.json());
```

## Performance Requirements

- **Swap Initiation**: < 10 seconds
- **Swap Completion**: < 30 seconds
- **Bridge Transaction**: < 60 seconds confirmation
- **Price Update**: < 5 seconds
- **Liquidity Swap**: < 10 seconds
- **Throughput**: > 100 cross-chain transactions/minute

## Security Considerations

### Smart Contract Security

- **Audited Contracts**: All contracts must undergo professional security audits
- **Reentrancy Protection**: All external calls have reentrancy guards
- **Access Control**: Strict admin-only functions with proper verification
- **Time Locks**: Appropriate time locks to prevent front-running
- **Emergency Controls**: Pause mechanisms for critical situations

### Operational Security

- **Multi-Source Oracles**: Multiple price feeds to prevent manipulation
- **Signature Verification**: Robust cross-chain signature validation
- **Liquidity Protection**: Flash loan attack prevention
- **Circuit Breakers**: Automatic shutdown on detected anomalies
- **Monitoring**: Real-time monitoring of all bridge operations

### Key Management

- **Cold Storage**: Admin keys stored in cold wallets
- **Multi-Signature**: Critical operations require multiple approvals
- **Key Rotation**: Regular key rotation policies
- **Access Logs**: Complete audit trail of all key usage

## Testing

### Smart Contract Tests

```bash
# Stellar contracts
cd smartcontracts/contracts/atomic_swap_contract
cargo test

# Ethereum/Polygon contracts
cd smartcontracts/ethereum-bridge
npx hardhat test
```

### Backend Tests

```bash
cd backend
pnpm test
pnpm test:e2e
pnpm test:cov
```

### Integration Tests

- Full cross-chain swap flow testing
- Atomic swap guarantee verification
- Liquidity provision and removal testing
- Price oracle accuracy validation
- Settlement netting verification

## Troubleshooting

### Common Issues

**Swap Not Completing**
- Check if time lock has expired
- Verify hash lock matches secret
- Ensure sufficient gas/fees
- Check relayer service status

**Price Feed Issues**
- Verify oracle source connectivity
- Check API key validity
- Enable fallback sources
- Review deviation thresholds

**Liquidity Pool Issues**
- Verify token approval
- Check slippage tolerance
- Ensure sufficient pool reserves
- Review fee configuration

## Future Enhancements

- **Additional Chains**: BSC, Solana, Avalanche support
- **Advanced AMM**: Concentrated liquidity, stable pools
- **Layer 2**: Optimism, Arbitrum integration
- **Cross-Chain Messaging**: Generalized message passing
- **Yield Farming**: LP token rewards and incentives
- **Analytics Dashboard**: Real-time bridge monitoring
- **Mobile SDK**: Cross-chain swap mobile integration

## Contributing

Please refer to the main CONTRIBUTING.md file for guidelines on contributing to the cross-chain bridge system.

## License

This cross-chain bridge system is part of the Paya platform and follows the same license terms.