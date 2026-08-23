# Paya Developer Onboarding Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Development Environment Setup](#development-environment-setup)
4. [Local Development Workflow](#local-development-workflow)
5. [Testing Procedures](#testing-procedures)
6. [Code Contribution Guidelines](#code-contribution-guidelines)
7. [Common Development Tasks](#common-development-tasks)

## Project Overview

### What is Paya?

Paya is a crypto payment infrastructure built on the Stellar network that enables merchants to accept cryptocurrency payments, manage subscriptions, and handle complex payment flows like escrow and payment splits.

### Key Features

- **Crypto Payments**: Accept payments in XLM and other Stellar assets
- **Subscription Billing**: Recurring payment management with flexible billing intervals
- **Payment Splits**: Split payments among multiple recipients
- **Escrow**: Secure payment holding with conditional release
- **Webhooks**: Real-time event notifications
- **Multi-currency**: Support for multiple currencies and assets
- **Developer-friendly**: RESTful API, SDKs, and comprehensive documentation

### Technology Stack

**Backend:**
- NestJS (Node.js framework)
- TypeORM (ORM)
- PostgreSQL (Database)
- Redis (Cache and queues)
- Bull (Job queues)
- Stellar SDK (Blockchain interaction)

**Frontend:**
- React (UI framework)
- TypeScript
- Tailwind CSS (Styling)
- Vite (Build tool)

**Smart Contracts:**
- Soroban (Stellar smart contracts)
- Rust (Contract language)

**Infrastructure:**
- Docker (Containerization)
- Nginx (Reverse proxy)
- PM2 (Process manager)

## Architecture

### System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│   Nginx         │
│   (Reverse      │
│    Proxy)      │
└────────┬────────┘
         │
         │ HTTP
         │
┌────────▼────────┐
│   Backend       │
│   (NestJS)      │
└────────┬────────┘
         │
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌──▼───┐  ┌───▼───┐  ┌──▼────┐
│  DB   │ │ Redis│  │  Bull  │  │Stellar│
│(PostgreSQL)│   │  │ Queues │  │Network│
└───────┘ └──────┘  └────────┘  └───────┘
```

### Module Structure

```
backend/src/
├── auth/                 # Authentication module
├── payment/              # Payment processing
├── payment-split/        # Payment splitting
├── refund/               # Refund processing
├── subscription/         # Subscription management
├── notification-service/ # Webhook and email notifications
├── webhook/              # Incoming webhooks
├── websocket/            # Real-time communication
├── escrow/               # Escrow management
└── app.module.ts         # Main application module
```

### Data Flow

1. **Payment Creation**: Frontend → Backend → Stellar Network
2. **Payment Confirmation**: Stellar Network → Backend → Webhook → Merchant
3. **Subscription Billing**: Scheduler → Backend → Stellar Network
4. **Webhook Delivery**: Backend → Bull Queue → Merchant Endpoint

## Development Environment Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14.x or higher
- **Redis**: v7.x or higher
- **Docker**: v20.x or higher (optional)
- **Git**: v2.x or higher
- **VS Code** (recommended) or your preferred IDE

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/0xNinx/paya.git
cd paya

# Switch to the main branch
git checkout main

# Install git hooks (if available)
npm run install:husky
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

**Smart Contracts:**
```bash
cd ../smartcontracts
npm install
```

### Step 3: Setup PostgreSQL

**Option A: Using Docker**
```bash
# Start PostgreSQL container
docker run -d \
  --name paya-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paya \
  -p 5432:5432 \
  postgres:14
```

**Option B: Local Installation**
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE paya;
CREATE USER paya_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE paya TO paya_user;
\q
```

### Step 4: Setup Redis

**Option A: Using Docker**
```bash
# Start Redis container
docker run -d \
  --name paya-redis \
  -p 6379:6379 \
  redis:7
```

**Option B: Local Installation**
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Step 5: Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=paya
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stellar Network
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# JWT
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
JWT_EXPIRATION=7d

# Email (optional for development)
EMAIL_FROM=noreply@paya.io
SENDGRID_API_KEY=your_sendgrid_key

# Webhook
WEBHOOK_SECRET=your_webhook_secret
```

**Frontend (.env):**
```bash
cd ../frontend
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

### Step 6: Run Database Migrations

```bash
cd backend

# Run migrations
npm run migration:run

# Verify migration status
npm run migration:show
```

### Step 7: Start Development Servers

**Backend:**
```bash
cd backend
npm run start:dev
```

The backend will start on `http://localhost:3000`

**Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### Step 8: Verify Installation

```bash
# Test backend health
curl http://localhost:3000/api/v1/health

# Test API endpoint
curl http://localhost:3000/api/v1/payments

# Open frontend in browser
open http://localhost:5173
```

### Step 9: Setup IDE (VS Code)

**Recommended Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens
- Docker
- PostgreSQL

**VS Code Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "backend/node_modules/typescript/lib",
  "eslint.workingDirectories": ["backend", "frontend"]
}
```

## Local Development Workflow

### Git Workflow

We use a feature branch workflow:

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes and commit**
```bash
git add .
git commit -m "feat: add your feature description"
```

3. **Push to remote**
```bash
git push origin feature/your-feature-name
```

4. **Create Pull Request**
- Go to GitHub
- Create PR from your branch to `main`
- Request review from team members

5. **After merge**
```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

### Commit Message Convention

We follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(payment): add support for custom fees
fix(subscription): fix proration calculation bug
docs(api): update payment API documentation
```

### Code Review Process

1. **Self-review** your code before creating PR
2. **Create PR** with clear description
3. **Request reviews** from appropriate team members
4. **Address feedback** in a timely manner
5. **Keep PR small** and focused on one feature
6. **Update documentation** if needed

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

## Testing Procedures

### Running Tests

**Backend Tests:**
```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test payment.service.spec.ts
```

**Frontend Tests:**
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

**Smart Contract Tests:**
```bash
cd smartcontracts

# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_payment_creation
```

### Test Coverage

We aim for:
- **Backend**: > 80% coverage
- **Frontend**: > 70% coverage
- **Smart Contracts**: > 90% coverage

### Writing Tests

**Backend Unit Test Example:**
```typescript
// payment.service.spec.ts
describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should create a payment', async () => {
    const payment = await service.createPayment({
      amount: 100,
      currency: 'XLM',
      merchantId: 'merchant_123',
    });

    expect(payment).toBeDefined();
    expect(payment.amount).toBe(100);
  });
});
```

**Frontend Component Test Example:**
```typescript
// PaymentForm.spec.tsx
import { render, screen } from '@testing-library/react';
import PaymentForm from './PaymentForm';

describe('PaymentForm', () => {
  it('renders payment form', () => {
    render(<PaymentForm />);
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('submits payment', async () => {
    render(<PaymentForm />);
    // Test submission logic
  });
});
```

### E2E Testing

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- payment-flow.spec.ts
```

## Code Contribution Guidelines

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### TypeScript Guidelines

- Use strict mode
- Enable noImplicitAny
- Use interfaces for object shapes
- Use types for primitives
- Avoid `any` type
- Use proper typing for functions

### Best Practices

**Backend:**
- Use dependency injection
- Follow SOLID principles
- Use DTOs for data validation
- Implement proper error handling
- Use transactions for database operations
- Add logging for important operations

**Frontend:**
- Use functional components
- Use hooks for state management
- Implement proper error boundaries
- Use TypeScript for type safety
- Optimize re-renders with useMemo/useCallback
- Implement loading states

**General:**
- Write meaningful commit messages
- Keep functions small and focused
- Add comments for complex logic
- Write tests for new features
- Update documentation
- Follow security best practices

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] All tests pass
- [ ] No linting errors
- [ ] Feature branch is up to date with main

## Common Development Tasks

### Adding a New API Endpoint

1. **Create DTO**
```typescript
// backend/src/payment/dto/create-payment.dto.ts
export class CreatePaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;
}
```

2. **Add Controller Method**
```typescript
// backend/src/payment/payment.controller.ts
@Post()
async createPayment(@Body() dto: CreatePaymentDto) {
  return this.paymentService.createPayment(dto);
}
```

3. **Add Service Method**
```typescript
// backend/src/payment/payment.service.ts
async createPayment(dto: CreatePaymentDto) {
  // Implementation
}
```

4. **Add Tests**
```typescript
// backend/src/payment/payment.controller.spec.ts
it('should create payment', async () => {
  const result = await controller.createPayment(dto);
  expect(result).toBeDefined();
});
```

### Adding a New Database Entity

1. **Create Entity**
```typescript
// backend/src/payment/entities/payment.entity.ts
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  amount: number;
}
```

2. **Create Migration**
```bash
npm run migration:generate -- -n AddPaymentEntity
```

3. **Run Migration**
```bash
npm run migration:run
```

### Adding a New Frontend Component

1. **Create Component**
```typescript
// frontend/src/components/PaymentForm.tsx
export const PaymentForm = () => {
  return <div>Payment Form</div>;
};
```

2. **Add Styles**
```typescript
// frontend/src/components/PaymentForm.module.css
.paymentForm {
  padding: 20px;
}
```

3. **Add Tests**
```typescript
// frontend/src/components/PaymentForm.spec.tsx
describe('PaymentForm', () => {
  it('renders', () => {
    render(<PaymentForm />);
  });
});
```

### Debugging

**Backend Debugging:**
```bash
# Start with debug mode
npm run start:debug

# Or use VS Code debugger
# Set breakpoints in VS Code
# Press F5 to start debugging
```

**Frontend Debugging:**
```bash
# Start with debug mode
npm run dev

# Open browser DevTools
# Set breakpoints in browser
```

**Database Debugging:**
```bash
# Connect to database
psql -U postgres -d paya

# View tables
\dt

# View table data
SELECT * FROM payments LIMIT 10;

# Exit
\q
```

**Redis Debugging:**
```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View specific key
GET key_name

# Exit
EXIT
```

### Useful Commands

**Backend:**
```bash
# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Generate migration
npm run migration:generate -- -n MigrationName
```

**Frontend:**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check
```

**Docker:**
```bash
# Build containers
docker-compose build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Remove volumes
docker-compose down -v
```

## Getting Help

### Internal Resources

- **Slack**: #paya-dev
- **Confluence**: Paya Documentation
- **Jira**: Paya Project Board

### External Resources

- **NestJS Documentation**: https://docs.nestjs.com
- **Stellar Documentation**: https://developers.stellar.org
- **TypeORM Documentation**: https://typeorm.io
- **React Documentation**: https://react.dev

### Contact

- **Tech Lead**: tech-lead@paya.io
- **DevOps**: devops@paya.io
- **On-Call**: +1-555-0123 (24/7)

## Next Steps

Now that you're set up, here's what to do next:

1. **Read the codebase**: Explore the project structure
2. **Run the tests**: Ensure everything is working
3. **Pick a small task**: Start with a simple bug fix or feature
4. **Ask questions**: Don't hesitate to ask for help
5. **Contribute**: Start making contributions!

Welcome to the Paya team! 🚀
