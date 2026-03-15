# PayChain

> **"Stripe for crypto payments — powered by Stellar."**

PayChain is an open-source, global crypto payment infrastructure that lets businesses and developers accept payments in multiple cryptocurrencies, automatically convert them to stablecoins, settle instantly on the Stellar network, and withdraw to bank accounts.

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

### What PayChain Does

| Feature | Description |
|---|---|
| **Payment Gateway** | Accept BTC, ETH, USDC, XLM; auto-convert to USDC on Stellar |
| **On-Ramp** | Fiat → USDC via card or bank transfer |
| **Off-Ramp** | USDC → bank account |
| **Escrow** | Smart contract escrow for freelance/marketplace use cases |
| **Payment Splits** | Auto-split payments to multiple addresses |
| **Subscriptions** | Recurring billing on-chain |
| **Merchant Dashboard** | Analytics, balances, API keys, withdrawals |
| **Developer API/SDK** | REST API + JS/Python/Go SDKs |

### Settlement Layer

All payments settle as **USDC on the Stellar network** via Soroban smart contracts.

---

## Architecture

```
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
        ├── Conversion Engine     → BTC/ETH → USDC conversion
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
        └── fee_manager_contract
```

---

## Repository Structure

```
paychain/
│
├── contracts/                        # Soroban smart contracts (Rust)
│   ├── escrow_contract/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── types.rs
│   │   │   ├── storage.rs
│   │   │   └── logic.rs
│   │   └── Cargo.toml
│   ├── payment_split_contract/
│   ├── subscription_contract/
│   ├── merchant_vault_contract/
│   ├── payment_registry_contract/
│   └── fee_manager_contract/
│
├── backend/                          # NestJS backend services
│   ├── api_gateway/
│   ├── payment_service/
│   ├── ramp_service/
│   ├── blockchain_listener/
│   ├── conversion_engine/
│   └── notification_service/
│
├── frontend/                         # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── dashboard/
│   ├── checkout/
│   ├── hooks/
│   └── services/
│
├── docs/                             # Documentation
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── CONTRIBUTING.md
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | >= 18 |
| Rust | Latest stable |
| Soroban CLI | Latest |
| Docker | >= 20 |
| pnpm | >= 8 |

### 1. Clone the Repository

```bash
git clone  https://github.com/StellarPaya/paya.git
cd paya
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Set Up Smart Contract Environment

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install --locked soroban-cli

# Add the WASM target
rustup target add wasm32-unknown-unknown
```

### 5. Configure Environment Variables

```bash
cp .env.example .env
# Fill in values — see Environment Variables section below
```

### 6. Run Local Development

```bash
# Start all services with Docker Compose
docker-compose up

# Or run individually
cd frontend && pnpm dev          # http://localhost:3000
cd backend && pnpm start:dev     # http://localhost:4000
```

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
DATABASE_URL=postgresql://localhost:5432/paychain

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

MIT © PayChain Contributors