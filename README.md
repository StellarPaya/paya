# Paya

> **"Crypto payments — powered by Stellar."**

Paya is an open-source, global crypto payment infrastructure that lets businesses and developers accept payments in multiple cryptocurrencies, automatically convert them to stablecoins, settle instantly on the Stellar network, and withdraw to bank accounts.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Smart Contracts (Soroban)](#smart-contracts-soroban)
- [Backend Services](#backend-services)
- [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

### What Paya Does

| Feature | Description |
| --- | --- |
| **Payment Gateway** | Accept crypto payments; settle as USDC on Stellar |
| **Escrow** | Smart contract escrow for freelance/marketplace use cases |
| **Payment Splits** | Auto-split payments to multiple addresses |
| **Subscriptions** | Recurring billing on-chain |
| **Merchant Dashboard** | Analytics, balances, withdrawals |
| **Developer API** | REST API for payment integration |

### Current Status (MVP)

**⚠️ Important:** The current implementation is an MVP. See [MVP_SUMMARY.md](MVP_SUMMARY.md) for detailed information about the current state.

- **Frontend:** Next.js 14 with file-based storage for payments (temporary)
- **Blockchain Monitoring:** JavaScript watcher monitors Stellar Horizon API
- **Smart Contracts:** Core contracts deployed (payment_registry, merchant_vault, escrow)
- **Backend:** NestJS backend exists but is not yet integrated with frontend

### Repository Audit

A comprehensive repository audit has been completed. See [docs/REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md) for detailed findings, recommendations, and security considerations.

### Settlement Layer

All payments settle as **USDC on the Stellar network** via Soroban smart contracts.

---

## Architecture

### MVP Architecture (Current)

```text
Users / Customers
        │
        ▼
Frontend (Next.js 14 + TypeScript)
        │  File-based storage (temporary)
        │  API Routes: /api/create-payment, /api/payment-status, /api/payments
        │
        ▼
Blockchain Watcher (JavaScript)
        │  Monitors Stellar Horizon API for USDC payments
        │  Updates payment status in local JSON file
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

### Planned Architecture (Future)

```text
Users / Customers
        │
        ▼
Frontend (Next.js + TypeScript)
        │  REST / WebSocket
        ▼
Backend Gateway (NestJS)
        │
        ├── Payment Service       → create, track, settle payments
        ├── Ramp Service          → fiat on/off ramp processing
        ├── Conversion Engine     → crypto → USDC conversion
        ├── Blockchain Listener   → watch Stellar transactions
        └── Notification Service → webhooks, email, alerts
        │
        ▼
Stellar Network (Testnet → Mainnet)
        │
        ▼
Soroban Smart Contracts
        ├── payment_registry_contract
        ├── merchant_vault_contract
        ├── escrow_contract
        ├── payment_split_contract
        ├── subscription_contract
        ├── fraud_detection_contract
        ├── atomic_swap_contract
        ├── liquidity_pool_contract
        └── orchestration_contract
```

---

## Repository Structure

```text
Paya/
│
├── smartcontracts/                   # Soroban smart contracts (Rust)
│   ├── contracts/
│   │   ├── payment_registry_contract/   # Core payment tracking (MVP)
│   │   ├── merchant_vault_contract/     # Merchant balance management (MVP)
│   │   ├── escrow_contract/             # Escrow payments (MVP)
│   │   ├── payment_split_contract/      # Payment splitting
│   │   ├── subscription_contract/       # Recurring billing
│   │   ├── fraud_detection_contract/    # On-chain fraud detection
│   │   ├── atomic_swap_contract/        # HTLC cross-chain swaps
│   │   ├── liquidity_pool_contract/      # AMM liquidity pool
│   │   ├── orchestration_contract/      # Saga pattern orchestration
│   │   ├── refund_contract/             # Refund management
│   │   └── hello_world/                 # Test contract
│   ├── Cargo.toml                       # Workspace manifest
│   └── scripts/
│       └── deploy-contracts.sh         # Deployment script
│
├── backend/                          # NestJS backend (not yet integrated)
│   ├── src/
│   │   ├── auth/                       # Authentication module
│   │   ├── payment-split/              # Payment split service
│   │   ├── subscription/               # Subscription service
│   │   ├── refund/                     # Refund service
│   │   ├── webhook/                    # Webhook service
│   │   ├── websocket/                  # WebSocket service
│   │   ├── fraud-detection/            # Fraud detection service
│   │   ├── conversion-engine/          # Currency conversion
│   │   ├── cross-chain-bridge/         # Cross-chain bridge
│   │   ├── event-sourcing/              # Event sourcing
│   │   ├── message-queue/              # Message queue (BullMQ)
│   │   └── notification-service/        # Notification service
│   ├── package.json
│   └── .github/workflows/ci.yml
│
├── frontend/                         # Next.js 14 frontend (MVP)
│   ├── app/
│   │   ├── api/                       # API routes (file-based storage)
│   │   │   ├── create-payment/
│   │   │   ├── payment-status/
│   │   │   └── payments/
│   │   ├── dashboard/                 # Dashboard pages
│   │   ├── checkout/                  # Checkout pages
│   │   └── payment-status/            # Payment status pages
│   ├── components/                    # React components
│   ├── data/                          # Local data storage (gitignored)
│   ├── watcher.js                     # Blockchain watcher
│   ├── package.json
│   └── .github/workflows/ci.yml
│
├── ml-service/                       # Python ML service for fraud detection
│   ├── app.py                         # FastAPI application
│   ├── models/                        # Trained ML models
│   ├── requirements.txt
│   └── README.md
│
├── docs/                             # Documentation
│   ├── REPOSITORY_AUDIT.md            # Comprehensive audit report
│   ├── FRAUD_DETECTION_SYSTEM.md      # Fraud detection docs
│   ├── MVP_SUMMARY.md                 # MVP implementation details
│   ├── ARCHITECTURE.md                # Architecture documentation
│   └── PROJECT_STRUCTURE.md           # Project structure guide
│
├── scripts/                          # Utility scripts
│   └── deploy-contracts.sh            # Contract deployment
│
├── .env.example                      # Environment variables template
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── PAYA.md
```

---

## Getting Started

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | >= 18 |
| Rust | Latest stable |
| Soroban CLI | Latest |
| pnpm | >= 8 |

### 1. Clone the Repository

```bash
git clone https://github.com/StellarPaya/paya.git
cd paya
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Frontend (MVP)

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Start the Blockchain Watcher

In a separate terminal:

```bash
cd frontend
node watcher.js
```

The watcher monitors Stellar Horizon API for USDC payments.

### 5. Deploy Smart Contracts (Optional)

See [scripts/deploy-contracts.sh](scripts/deploy-contracts.sh) for deployment instructions.

### 6. Start ML Service (Optional)

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

The ML service will be available at `http://localhost:8000`.

---

## Smart Contracts (Soroban)

Each contract is a standalone Rust crate. They are modular — one contract, one responsibility.

### Contracts

| Contract | Purpose |
|---|---|
| `payment_registry_contract` | Ledger of all payment records |
| `merchant_vault_contract` | Holds and manages merchant funds |
| `escrow_contract` | Holds funds until conditions are met |
| `payment_split_contract` | Splits a payment across multiple parties |
| `subscription_contract` | Manages recurring billing |
| `fee_manager_contract` | Calculates and collects platform fees |

### Build Contracts

```bash
cd contracts/escrow_contract
cargo build --target wasm32-unknown-unknown --release
```

### Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow_contract.wasm \
  --source <YOUR_SECRET_KEY> \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### Run Contract Tests

```bash
cd contracts/escrow_contract
cargo test
```

---

## Backend Services

The backend is a **NestJS monorepo** with independent services.

| Service | Port | Responsibility |
|---|---|---|
| `api_gateway` | 4000 | Route requests, auth, rate limiting |
| `payment_service` | 4001 | Payment creation and tracking |
| `ramp_service` | 4002 | Fiat on/off ramp |
| `blockchain_listener` | 4003 | Monitor Stellar transactions |
| `conversion_engine` | 4004 | Crypto-to-USDC conversion |
| `notification_service` | 4005 | Webhooks and email |

### Key API Endpoints

```
POST   /api/payments            → create a payment
GET    /api/payments/:id        → get payment status
POST   /api/ramp/onramp         → initiate on-ramp
POST   /api/ramp/offramp        → initiate off-ramp
POST   /api/webhooks/register   → register webhook URL
GET    /api/merchants/balance   → get merchant balance
```

---

## Frontend

Built with **Next.js 14 + TypeScript + Tailwind CSS**.

### Key Pages

| Route | Description |
|---|---|
| `/checkout/[id]` | Customer payment checkout page |
| `/dashboard` | Merchant overview and analytics |
| `/dashboard/payments` | Payment history |
| `/dashboard/withdrawals` | Withdrawal management |
| `/dashboard/api-keys` | API key management |
| `/dashboard/settings` | Merchant settings |

---

## Environment Variables

```env
# Stellar
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_TREASURY_ADDRESS=

# Contracts
PAYMENT_REGISTRY_CONTRACT_ID=
MERCHANT_VAULT_CONTRACT_ID=
ESCROW_CONTRACT_ID=
PAYMENT_SPLIT_CONTRACT_ID=
SUBSCRIPTION_CONTRACT_ID=
FEE_MANAGER_CONTRACT_ID=

# Database
DATABASE_URL=postgresql://localhost:5432/Paya

# Auth
JWT_SECRET=
API_KEY_SALT=

# Exchange / Conversion
EXCHANGE_API_KEY=
PRICE_ORACLE_URL=

# Notifications
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# App
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Running Tests

```bash
# Smart contract tests
cd contracts/escrow_contract && cargo test

# Backend unit tests
cd backend && pnpm test

# Backend e2e tests
cd backend && pnpm test:e2e

# Frontend tests
cd frontend && pnpm test
```

---

## Contributing

We welcome all contributors! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.

Key areas where you can help:
- Soroban smart contracts (Rust)
- Backend API services (TypeScript / NestJS)
- Frontend UI components (React / Next.js)
- Documentation
- Testing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar + Soroban |
| Smart Contracts | Rust |
| Backend | NestJS (TypeScript) |
| Frontend | Next.js 14 (TypeScript) |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | BullMQ |
| Styling | Tailwind CSS |
| Testing | Vitest, Jest, cargo test |

---

## Roadmap

### MVP (v1.0)
- [x] Project scaffolding
- [ ] Payment registry contract
- [ ] Merchant vault contract
- [ ] Payment creation API
- [ ] Stellar blockchain listener
- [ ] Checkout UI
- [ ] Merchant dashboard (basic)

### v1.1
- [ ] Escrow contract
- [ ] Payment split contract
- [ ] On-ramp (card payments)
- [ ] Off-ramp (bank transfer)

### v2.0
- [ ] Subscription contract
- [ ] Multi-chain expansion
- [ ] Mobile apps
- [ ] Advanced fraud detection

---

## License

MIT © Paya Contributors
