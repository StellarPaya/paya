# Paya MVP Architecture

**Last Updated:** 2025-01-11
**Status:** Current Implementation

## Overview

This document describes the **current MVP architecture** of Paya. For the planned production architecture, see [architecture/SYSTEM_ARCHITECTURE.md](architecture/SYSTEM_ARCHITECTURE.md).

## Current Implementation

### Architecture Diagram

```text
Users / Customers
        │
        ▼
Frontend (Next.js 14 + TypeScript)
        │  File-based storage (frontend/data/payments.json)
        │  API Routes: /api/create-payment, /api/payment-status, /api/payments
        │
        ▼
Blockchain Watcher (JavaScript)
        │  Monitors Stellar Horizon API for USDC payments
        │  Updates payment status in local JSON file
        │  Manual fallback for demo/testing (disabled by default)
        │
        ▼
Stellar Network (Testnet)
        │
        ▼
Soroban Smart Contracts (Deployed)
        ├── payment_registry_contract  (MVP)
        ├── merchant_vault_contract    (MVP)
        └── escrow_contract            (MVP)
```

## Components

### Frontend (Next.js 14)

**Location:** `frontend/`

**Purpose:** User interface and payment management

**Key Features:**
- Dashboard for viewing payments
- Checkout flow for creating payments
- Payment status tracking
- File-based payment storage (temporary)

**API Routes:**
- `POST /api/create-payment` - Creates a new payment record
- `GET /api/payment-status/[id]` - Gets payment status by ID
- `GET /api/payments` - Lists all payments

**Storage:**
- File-based JSON storage at `frontend/data/payments.json`
- Gitignored for local development
- Temporary solution until backend integration

**Dependencies:**
- Next.js 14
- React
- Tailwind CSS
- Stellar SDK
- Vitest (testing)

### Blockchain Watcher

**Location:** `frontend/watcher.js`

**Purpose:** Monitor Stellar Horizon API for USDC payments

**Key Features:**
- Polls Stellar Horizon API every 10 seconds
- Matches transactions by memo to pending payments
- Verifies USDC issuer address (security improvement)
- Exact amount matching (no tolerance)
- Manual fallback for demo/testing (disabled by default)

**Security:**
- USDC issuer verification
- Exact amount matching (removed tolerance)
- Manual fallback requires explicit enablement
- Security warnings in code

**Configuration:**
- `STELLAR_HORIZON_URL` - Horizon API endpoint
- `STELLAR_NETWORK_PASSPHRASE` - Network passphrase
- `ENABLE_MANUAL_FALLBACK` - Manual fallback flag (default: false)

### Smart Contracts (Soroban)

**Location:** `smartcontracts/contracts/`

**Deployed Contracts (MVP):**

1. **payment_registry_contract**
   - Core payment tracking
   - Payment lifecycle management
   - State checkpointing
   - Atomic operations support

2. **merchant_vault_contract**
   - Merchant balance management
   - Deposit and commit operations
   - Rollback support
   - Admin controls

3. **escrow_contract**
   - Escrow payment management
   - Conditional release
   - Dispute resolution
   - Atomic operations support

**Additional Contracts (Not Yet Deployed):**
- payment_split_contract
- subscription_contract
- fraud_detection_contract
- atomic_swap_contract
- liquidity_pool_contract
- orchestration_contract
- refund_contract

**Deployment:**
- Deployed via `scripts/deploy-contracts.sh`
- Currently deploys only MVP contracts
- Testnet deployment

### Backend (NestJS)

**Location:** `backend/`

**Status:** **Not yet integrated with frontend**

**Purpose:** Planned backend services for production

**Modules (Defined but Not Used):**
- Auth - Authentication and authorization
- PaymentSplit - Payment splitting
- Subscription - Subscription billing
- Refund - Refund processing
- Webhook - Webhook delivery
- Websocket - Real-time communication
- FraudDetection - Fraud detection service
- ConversionEngine - Currency conversion
- CrossChainBridge - Cross-chain operations
- EventSourcing - Event sourcing
- MessageQueue - BullMQ integration
- NotificationService - Notifications

**Dependencies:**
- NestJS
- TypeORM (PostgreSQL)
- BullMQ (Redis)
- Stellar SDK
- bcrypt (hashing)

### ML Service

**Location:** `ml-service/`

**Status:** **Not yet integrated**

**Purpose:** Machine learning-based fraud detection

**Features:**
- Random Forest for fraud classification
- Isolation Forest for anomaly detection
- SHAP values for explainability
- Graph analysis for fraud rings
- Model training endpoint

**Dependencies:**
- FastAPI
- scikit-learn
- pandas
- numpy
- networkx
- shap

## Data Flow

### Payment Creation Flow (MVP)

```text
User
  │
  ▼
Frontend Checkout
  │
  ▼
POST /api/create-payment
  │
  ▼
Create payment record in frontend/data/payments.json
  │
  ▼
Return payment ID and deposit address to user
  │
  ▼
User sends USDC to deposit address with memo
  │
  ▼
Blockchain Watcher monitors Horizon API
  │
  ▼
Match transaction by memo
  │
  ▼
Verify USDC issuer and amount
  │
  ▼
Update payment status to PAID in JSON file
  │
  ▼
Frontend displays updated status
```

## Security Considerations

### Current Security Measures

1. **USDC Issuer Verification**
   - Watcher verifies USDC token issuer address
   - Prevents fake USDC tokens

2. **Exact Amount Matching**
   - Removed tolerance for amount verification
   - Prevents amount manipulation

3. **Manual Fallback Control**
   - Manual fallback disabled by default
   - Requires explicit environment variable
   - Security warnings in code

4. **Smart Contract Security**
   - Admin-only functions
   - Reentrancy protection
   - Access controls
   - Pause mechanisms

### Known Security Limitations

1. **File-Based Storage**
   - Not suitable for production
   - No transaction guarantees
   - No backup/recovery
   - Should be replaced with PostgreSQL

2. **No Authentication**
   - Frontend API routes have no auth
   - Anyone can create payments
   - Should add JWT authentication

3. **No Backend Integration**
   - Backend modules exist but unused
   - No proper service layer
   - Should integrate with NestJS backend

4. **Manual Fallback Risk**
   - If enabled, bypasses blockchain verification
   - Should never be enabled in production

## Migration Path to Production

### Phase 1: Backend Integration

1. Integrate frontend with NestJS backend
2. Replace file-based storage with PostgreSQL
3. Add authentication to API routes
4. Implement proper API endpoints in backend

### Phase 2: Smart Contract Integration

1. Deploy additional smart contracts
2. Integrate payment registry with frontend
3. Implement on-chain payment verification
4. Remove blockchain watcher (use smart contracts instead)

### Phase 3: ML Service Integration

1. Integrate ML service with backend
2. Implement fraud detection in payment flow
3. Add risk评分 to payments
4. Implement fraud prevention rules

### Phase 4: Production Readiness

1. Add comprehensive testing
2. Implement proper error handling
3. Add monitoring and logging
4. Deploy to production infrastructure
5. Security audit

## Environment Variables

### MVP Required Variables

```bash
# Stellar Configuration
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Soroban Configuration
SOROBAN_SECRET_KEY=your-secret-key-here
SOROBAN_PUBLIC_KEY=your-public-key-here

# Frontend Watcher Configuration
ENABLE_MANUAL_FALLBACK=false

# MVP Demo Configuration
MVP_DEPOSIT_ADDRESS=GCF6EXAMPLEDEMOADDRESSFORUSDC3
```

### Future Variables (Not Used in MVP)

```bash
# Contract IDs (set after deployment)
PAYMENT_REGISTRY_CONTRACT_ID=
MERCHANT_VAULT_CONTRACT_ID=
ESCROW_CONTRACT_ID=
PAYMENT_SPLIT_CONTRACT_ID=
SUBSCRIPTION_CONTRACT_ID=
FRAUD_DETECTION_CONTRACT_ID=
ATOMIC_SWAP_CONTRACT_ID=
LIQUIDITY_POOL_CONTRACT_ID=
ORCHESTRATION_CONTRACT_ID=
REFUND_CONTRACT_ID=

# Database (for future backend implementation)
DATABASE_URL=postgresql://localhost:5432/paya

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_SECRET=your-jwt-access-secret-here
JWT_ACCESS_EXPIRES_IN=15m
API_KEY_SALT=your-api-key-salt-here

# Exchange / Conversion (for future implementation)
EXCHANGE_API_KEY=
PRICE_ORACLE_URL=

# Notifications (for future implementation)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@paya.io

# Redis (for future backend implementation)
REDIS_URL=redis://localhost:6379
```

## Testing

### Current Testing

- Frontend: Vitest configured
- Smart Contracts: Rust unit tests
- Backend: Jest configured (not integrated)

### Testing Gaps

- No integration tests
- No end-to-end tests
- No frontend-backend integration tests
- No smart contract integration tests

## Deployment

### Current Deployment

- Frontend: Local development only
- Smart Contracts: Testnet via deployment script
- Backend: Not deployed
- ML Service: Not deployed

### Production Deployment Requirements

1. Frontend deployment (Vercel, Netlify, or similar)
2. Backend deployment (Docker, Kubernetes)
3. Database setup (PostgreSQL)
4. Redis setup (for caching and queues)
5. Smart contract deployment (mainnet)
6. ML service deployment
7. Monitoring and logging setup
8. CI/CD pipeline

## References

- [MVP_SUMMARY.md](MVP_SUMMARY.md) - Detailed MVP implementation notes
- [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md) - Comprehensive audit findings
- [architecture/SYSTEM_ARCHITECTURE.md](architecture/SYSTEM_ARCHITECTURE.md) - Planned production architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
