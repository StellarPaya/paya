# Paya Project Structure

**Last Updated:** 2025-01-11

## Overview

This document provides a detailed breakdown of the Paya repository structure, explaining the purpose of each directory and key files.

## Root Directory

```
paya/
├── smartcontracts/          # Soroban smart contracts (Rust)
├── backend/                 # NestJS backend services (TypeScript)
├── frontend/                # Next.js 14 frontend (TypeScript/React)
├── ml-service/              # Python ML service for fraud detection
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore patterns
├── README.md                # Main project documentation
├── MVP_SUMMARY.md           # MVP implementation details
├── PAYA.md                  # Project summary
├── CONTRIBUTING.md          # Contribution guidelines
└── Cargo.toml               # Rust workspace manifest (for smart contracts)
```

## Smart Contracts (`smartcontracts/`)

### Purpose
Soroban smart contracts for payment infrastructure on Stellar.

### Structure

```
smartcontracts/
├── Cargo.toml               # Workspace manifest
├── contracts/
│   ├── payment_registry_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs       # Main contract interface
│   │       ├── types.rs     # Type definitions
│   │       ├── storage.rs   # Storage operations
│   │       └── logic.rs     # Business logic
│   ├── merchant_vault_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── escrow_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── payment_split_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── subscription_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── fraud_detection_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── atomic_swap_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── liquidity_pool_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── orchestration_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   ├── refund_contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs
│   │       ├── storage.rs
│   │       └── logic.rs
│   └── hello_world/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs       # Test contract
└── scripts/
    └── deploy-contracts.sh  # Deployment script
```

### Contract Descriptions

| Contract | Status | Purpose |
| --- | --- | --- |
| payment_registry_contract | MVP | Core payment tracking and lifecycle management |
| merchant_vault_contract | MVP | Merchant balance management and deposits |
| escrow_contract | MVP | Escrow payments with conditional release |
| payment_split_contract | Planned | Multi-recipient payment splitting |
| subscription_contract | Planned | Recurring billing and subscriptions |
| fraud_detection_contract | Planned | On-chain fraud detection |
| atomic_swap_contract | Planned | HTLC cross-chain swaps |
| liquidity_pool_contract | Planned | AMM liquidity pool |
| orchestration_contract | Planned | Saga pattern orchestration |
| refund_contract | Planned | Refund and dispute management |
| hello_world | Test | Simple test contract |

## Backend (`backend/`)

### Purpose
NestJS backend services for payment processing, authentication, and business logic.

**Status:** Not yet integrated with frontend. Modules defined but not used in MVP.

### Structure

```
backend/
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── nest-cli.json            # NestJS CLI configuration
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── auth/                # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── ...
│   ├── payment-split/       # Payment split service
│   │   ├── payment-split.module.ts
│   │   ├── payment-split.controller.ts
│   │   ├── payment-split.service.ts
│   │   └── ...
│   ├── subscription/        # Subscription service
│   │   ├── subscription.module.ts
│   │   ├── subscription.controller.ts
│   │   ├── subscription.service.ts
│   │   └── ...
│   ├── refund/              # Refund service
│   │   ├── refund.module.ts
│   │   ├── refund.controller.ts
│   │   ├── refund.service.ts
│   │   └── ...
│   ├── webhook/             # Webhook service
│   │   ├── webhook.module.ts
│   │   ├── webhook.controller.ts
│   │   ├── webhook.service.ts
│   │   └── ...
│   ├── websocket/           # WebSocket service
│   │   ├── websocket.module.ts
│   │   ├── websocket.gateway.ts
│   │   └── ...
│   ├── fraud-detection/     # Fraud detection service
│   │   ├── fraud-detection.module.ts
│   │   ├── fraud-detection.controller.ts
│   │   ├── fraud-detection.service.ts
│   │   └── ...
│   ├── conversion-engine/   # Currency conversion
│   │   ├── conversion-engine.module.ts
│   │   ├── conversion-engine.service.ts
│   │   └── ...
│   ├── cross-chain-bridge/  # Cross-chain operations
│   │   ├── cross-chain-bridge.module.ts
│   │   ├── cross-chain-bridge.service.ts
│   │   └── ...
│   ├── event-sourcing/      # Event sourcing
│   │   ├── event-sourcing.module.ts
│   │   ├── event-sourcing.service.ts
│   │   └── ...
│   ├── message-queue/       # BullMQ integration
│   │   ├── message-queue.module.ts
│   │   ├── message-queue.service.ts
│   │   └── ...
│   └── notification-service/  # Notification service
│       ├── notification-service.module.ts
│       ├── notification-service.service.ts
│       └── ...
├── test/
│   ├── unit/                # Unit tests
│   └── e2e/                 # End-to-end tests
└── .github/
    └── workflows/
        └── ci.yml           # CI/CD workflow
```

### Key Dependencies

- **NestJS**: Framework
- **TypeORM**: ORM for PostgreSQL
- **BullMQ**: Job queue (Redis)
- **Stellar SDK**: Stellar integration
- **bcrypt**: Password hashing
- **JWT**: Authentication

## Frontend (`frontend/`)

### Purpose
Next.js 14 frontend for user interface and payment management.

**Status:** MVP implementation with file-based storage.

### Structure

```
frontend/
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── api/                 # API routes (file-based storage)
│   │   ├── create-payment/
│   │   │   └── route.ts     # POST /api/create-payment
│   │   ├── payment-status/
│   │   │   └── [id]/
│   │   │       └── route.ts # GET /api/payment-status/[id]
│   │   └── payments/
│   │       └── route.ts     # GET /api/payments
│   ├── dashboard/           # Dashboard pages
│   │   ├── page.tsx
│   │   └── ...
│   ├── checkout/            # Checkout pages
│   │   ├── page.tsx
│   │   └── ...
│   └── payment-status/      # Payment status pages
│       ├── page.tsx
│       └── ...
├── components/             # React components
│   ├── ui/                  # UI components
│   ├── dashboard/           # Dashboard components
│   ├── checkout/            # Checkout components
│   └── ...
├── data/                   # Local data storage (gitignored)
│   └── payments.json        # Payment records
├── watcher.js              # Blockchain watcher
├── lib/                    # Utility functions
├── hooks/                  # Custom React hooks
└── .github/
    └── workflows/
        └── ci.yml           # CI/CD workflow
```

### Key Dependencies

- **Next.js 14**: Framework
- **React**: UI library
- **Tailwind CSS**: Styling
- **Stellar SDK**: Stellar integration
- **lucide-react**: Icons
- **recharts**: Charts
- **vitest**: Testing

### API Routes

| Route | Method | Purpose | Storage |
| --- | --- | --- | --- |
| /api/create-payment | POST | Create payment | JSON file |
| /api/payment-status/[id] | GET | Get payment status | JSON file |
| /api/payments | GET | List all payments | JSON file |

## ML Service (`ml-service/`)

### Purpose
Python FastAPI service for machine learning-based fraud detection.

**Status:** Not yet integrated with backend.

### Structure

```
ml-service/
├── requirements.txt         # Python dependencies
├── app.py                   # FastAPI application
├── models/                  # Trained ML models
│   ├── random_forest.pkl
│   ├── isolation_forest.pkl
│   └── scaler.pkl
├── tests/                   # Python tests
└── README.md                # ML service documentation
```

### API Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| /predict | POST | Predict fraud probability |
| /explain | POST | Get SHAP values for prediction |
| /train | POST | Train models with data |
| /detect-anomalies | POST | Detect anomalous transactions |
| /analyze-graph | POST | Analyze transaction graphs |
| /health | GET | Service health check |

### Key Dependencies

- **FastAPI**: Web framework
- **scikit-learn**: ML models
- **pandas**: Data manipulation
- **numpy**: Numerical computing
- **shap**: Model explainability
- **networkx**: Graph analysis

## Documentation (`docs/`)

### Purpose
Project documentation and guides.

### Structure

```
docs/
├── REPOSITORY_AUDIT.md      # Comprehensive audit report
├── MVP_SUMMARY.md           # MVP implementation details
├── MVP_ARCHITECTURE.md      # Current MVP architecture
├── PAYA.md                  # Project summary
├── FRAUD_DETECTION_SYSTEM.md # Fraud detection docs
├── CONTRIBUTING.md          # Contribution guidelines
└── architecture/            # Architecture documentation
    ├── SYSTEM_ARCHITECTURE.md
    ├── SERVICE_ARCHITECTURE.md
    ├── DATA_ARCHITECTURE.md
    ├── SECURITY_ARCHITECTURE.md
    ├── SCALABILITY_ARCHITECTURE.md
    └── DEPLOYMENT_ARCHITECTURE.md
```

## Scripts (`scripts/`)

### Purpose
Utility scripts for deployment and automation.

### Structure

```
scripts/
└── deploy-contracts.sh      # Smart contract deployment script
```

### deploy-contracts.sh

Deploys Soroban smart contracts to Stellar testnet:
- payment_registry_contract
- merchant_vault_contract
- escrow_contract

## Configuration Files

### `.env.example`

Template for environment variables. Copy to `.env` and fill in values.

### `.gitignore`

Git ignore patterns for:
- Dependencies (node_modules/)
- Build outputs (dist/)
- Environment files (.env)
- Local data (frontend/data/)
- Development artifacts

## Root Documentation Files

### `README.md`

Main project documentation with:
- Project overview
- Architecture diagrams
- Getting started guide
- Repository structure
- Smart contracts documentation

### `MVP_SUMMARY.md`

Detailed MVP implementation notes:
- Current implementation status
- API routes
- Blockchain watcher
- Next steps for production

### `PAYA.md`

Concise project summary:
- Purpose
- How it works
- Roadmap

### `CONTRIBUTING.md`

Contribution guidelines:
- Code of conduct
- Development setup
- Branch naming
- Commit message format
- Pull request process

## Development Workflow

### Frontend Development

```bash
cd frontend
pnpm install
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm test         # Run tests
```

### Backend Development

```bash
cd backend
pnpm install
pnpm start:dev    # Start development server
pnpm build        # Build for production
pnpm test         # Run tests
```

### Smart Contract Development

```bash
cd smartcontracts/contracts/<contract-name>
cargo build --target wasm32-unknown-unknown --release
cargo test
```

### ML Service Development

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

## Testing

### Frontend Tests

- Framework: Vitest
- Location: `frontend/test/`
- Run: `pnpm test`

### Backend Tests

- Framework: Jest
- Location: `backend/test/`
- Run: `pnpm test`

### Smart Contract Tests

- Framework: Rust built-in
- Location: Each contract's `src/` directory
- Run: `cargo test`

## CI/CD

### Backend CI

- Location: `backend/.github/workflows/ci.yml`
- Triggers: Push/PR to main, dev, develop
- Jobs: Lint, test, license check, build

### Frontend CI

- Location: `frontend/.github/workflows/ci.yml`
- Triggers: Push/PR to main, dev, develop
- Jobs: Lint, test, license check, build

## Deployment

### Smart Contracts

Deploy via script:
```bash
./scripts/deploy-contracts.sh
```

### Frontend

Deploy to Vercel, Netlify, or similar platform.

### Backend

Deploy via Docker or Kubernetes (not yet implemented).

## Security Considerations

- File-based storage is temporary and not production-ready
- Manual fallback in watcher should be disabled in production
- Smart contracts need professional security audit before mainnet
- Environment variables should be properly managed in production
- API routes currently have no authentication

## Migration Path

See [MVP_ARCHITECTURE.md](MVP_ARCHITECTURE.md) for detailed migration path from MVP to production.
