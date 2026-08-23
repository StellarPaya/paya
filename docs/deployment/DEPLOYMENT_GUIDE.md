# Paya Platform Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Smart Contract Deployment](#smart-contract-deployment)
6. [Database Migration](#database-migration)
7. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14.x or higher
- **Redis**: v7.x or higher
- **Docker**: v20.x or higher (for containerized deployment)
- **Docker Compose**: v2.x or higher
- **Git**: v2.x or higher

### Environment Variables
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=paya

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stellar Network
STELLAR_NETWORK=testnet  # or 'mainnet' for production
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=7d

# Email (for notifications)
EMAIL_FROM=noreply@paya.io
SENDGRID_API_KEY=your_sendgrid_key

# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
```

## Development Deployment

### Local Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/0xNinx/paya.git
cd paya
```

#### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

**Smart Contracts:**
```bash
cd smartcontracts
npm install
```

#### 3. Setup PostgreSQL Database

**Using Docker:**
```bash
docker run -d \
  --name paya-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paya \
  -p 5432:5432 \
  postgres:14
```

**Or using local PostgreSQL:**
```bash
sudo -u postgres psql
CREATE DATABASE paya;
CREATE USER paya_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE paya TO paya_user;
\q
```

#### 4. Setup Redis

**Using Docker:**
```bash
docker run -d \
  --name paya-redis \
  -p 6379:6379 \
  redis:7
```

#### 5. Configure Environment

Create `.env` file in backend directory:
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

#### 6. Run Database Migrations
```bash
npm run migration:run
```

#### 7. Start Development Servers

**Backend:**
```bash
npm run start:dev
```

**Frontend:**
```bash
cd ../frontend
npm run dev
```

#### 8. Verify Installation
```bash
# Backend health check
curl http://localhost:3000/api/v1/health

# Frontend access
open http://localhost:5173
```

### Docker Compose Development

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Staging Deployment

### Prerequisites
- Staging server access (SSH)
- Domain name configured (e.g., staging.paya.io)
- SSL certificate configured
- Database backup from production (optional)

### Deployment Steps

#### 1. Prepare Staging Environment

```bash
# SSH into staging server
ssh user@staging.paya.io

# Clone repository
git clone https://github.com/0xNinx/paya.git
cd paya
git checkout staging
```

#### 2. Install Dependencies

```bash
cd backend
npm ci --production
```

#### 3. Configure Environment

```bash
cp .env.staging .env
# Edit .env with staging-specific values
```

#### 4. Setup Database

```bash
# Create staging database
createdb paya_staging

# Run migrations
npm run migration:run
```

#### 5. Build Application

```bash
npm run build
```

#### 6. Setup Systemd Service

Create `/etc/systemd/system/paya-backend.service`:
```ini
[Unit]
Description=Paya Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=paya
WorkingDirectory=/home/paya/backend
ExecStart=/usr/bin/node /home/paya/backend/dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=staging
EnvironmentFile=/home/paya/backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable paya-backend
sudo systemctl start paya-backend
```

#### 7. Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/paya-staging`:
```nginx
server {
    listen 80;
    server_name staging.paya.io;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/paya-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 8. Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d staging.paya.io
```

#### 9. Deploy Frontend

```bash
cd ../frontend
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/paya-staging/
```

#### 10. Verify Deployment

```bash
# Health check
curl https://staging.paya.io/api/v1/health

# Check logs
sudo journalctl -u paya-backend -f
```

## Production Deployment

### Prerequisites
- Production	server access (SSH)
- Domain name configured (e.g., api.paya.io)
- SSL certificate configured
- Database backup strategy in place
- Monitoring and alerting configured

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Database migrations tested on staging
- [ ] Environment variables configured
- [ ] Backup of current production database
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled

### Deployment Steps

#### 1. Create Backup

```bash
# Database backup
pg_dump -U postgres paya > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup current deployment
cd /home/paya
tar -czf paya_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/
```

#### 2. Deploy New Version

```bash
# SSH into production server
ssh user@prod.paya.io

# Navigate to deployment directory
cd /home/paya

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Install dependencies
cd backend
npm ci --production

# Build application
npm run build

# Run database migrations
npm run migration:run
```

#### 3. Zero-Downtime Deployment

Using PM2:
```bash
# Install PM2 globally
npm install -g pm2

# Start new instance
pm2 start dist/main.js --name paya-backend-new

# Switch traffic
pm2 gracefulReload paya-backend

# Cleanup old instance
pm2 delete paya-backend-old
```

Or using Blue-Green deployment:
```bash
# Start new version on port 3001
PORT=3001 npm run start:prod &

# Update Nginx to point to new port
# Test new version
# Update Nginx to point back to port 3000
# Stop old version
```

#### 4. Verify Deployment

```bash
# Health check
curl https://api.paya.io/api/v1/health

# Check critical endpoints
curl https://api.paya.io/api/v1/payments
curl https://api.paya.io/api/v1/subscriptions

# Check logs
pm2 logs paya-backend
```

#### 5. Post-Deployment Verification

```bash
# Verify database migrations
psql -U postgres -d paya -c "SELECT version FROM schema_migrations;"

# Verify Redis connectivity
redis-cli ping

# Verify Stellar connectivity
curl https://horizon.stellar.org/
```

## Smart Contract Deployment

### Prerequisites
- Soroban CLI installed
- Stellar account with sufficient XLM
- Network access (testnet or mainnet)

### Testnet Deployment

#### 1. Setup Soroban CLI

```bash
# Install Soroban CLI
cargo install soroban-cli

# Configure network
soroban config network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Configure identity
soroban config identity add testnet_admin \
  --secret-key YOUR_SECRET_KEY
```

#### 2. Build Contracts

```bash
cd smartcontracts
npm install
npm run build
```

#### 3. Deploy Payment Contract

```bash
# Deploy payment contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_contract.wasm \
  --source testnet_admin \
  --network testnet

# Save contract ID
PAYMENT_CONTRACT_ID=<deployed_contract_id>
```

#### 4. Deploy Subscription Contract

```bash
# Deploy subscription contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/subscription_contract.wasm \
  --source testnet_admin \
  --network testnet

# Save contract ID
SUBSCRIPTION_CONTRACT_ID=<deployed_contract_id>
```

#### 5. Initialize Contracts

```bash
# Initialize payment contract
soroban contract invoke \
  --id $PAYMENT_CONTRACT_ID \
  --source testnet_admin \
  --network testnet \
  initialize \
  --admin ADMIN_PUBLIC_KEY

# Initialize subscription contract
soroban contract invoke \
  --id $SUBSCRIPTION_CONTRACT_ID \
  --source testnet_admin \
  --network testnet \
  initialize \
  --payment_contract $PAYMENT_CONTRACT_ID \
  --admin ADMIN_PUBLIC_KEY
```

#### 6. Update Environment Variables

```bash
# Add to backend .env
PAYMENT_CONTRACT_ID=$PAYMENT_CONTRACT_ID
SUBSCRIPTION_CONTRACT_ID=$SUBSCRIPTION_CONTRACT_ID
```

### Mainnet Deployment

#### 1. Configure Mainnet

```bash
# Add mainnet network
soroban config network add mainnet \
  --rpc-url https://soroban.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"

# Configure mainnet identity
soroban config identity add mainnet_admin \
  --secret-key YOUR_MAINNET_SECRET_KEY
```

#### 2. Deploy Contracts

```bash
# Deploy to mainnet (same commands as testnet, but with --network mainnet)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_contract.wasm \
  --source mainnet_admin \
  --network mainnet
```

#### 3. Verify Deployment

```bash
# Verify contract code
soroban contract inspect \
  --id $CONTRACT_ID \
  --network mainnet

# Test contract functionality
soroban contract invoke \
  --id $CONTRACT_ID \
  --source mainnet_admin \
  --network mainnet \
  get_admin
```

## Database Migration

### Migration Strategy

#### TypeORM Migrations

```bash
# Generate migration from schema changes
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

#### Manual SQL Migrations

```bash
# Create migration file
touch migrations/20240101_add_new_table.sql

# Run migration
psql -U postgres -d paya -f migrations/20240101_add_new_table.sql

# Verify migration
psql -U postgres -d paya -c "\d new_table"
```

### Migration Best Practices

1. **Always test on staging first**
2. **Create backup before migration**
3. **Use transactions for complex migrations**
4. **Document breaking changes**
5. **Plan rollback strategy**

### Example Migration

```sql
-- Migration: Add subscription indexes
BEGIN;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_merchant_status 
  ON subscriptions(merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_subscription_next_payment 
  ON subscriptions(next_payment_at) 
  WHERE status = 'ACTIVE';

-- Update data
UPDATE subscriptions 
  SET metadata = jsonb_set(metadata, '{migrated}', 'true')
  WHERE metadata ? 'migrated' IS NOT NULL;

COMMIT;
```

## Rollback Procedures

### Database Rollback

#### 1. Restore from Backup

```bash
# Stop application
sudo systemctl stop paya-backend

# Restore database
psql -U postgres -d paya < backup_20240101_120000.sql

# Restart application
sudo systemctl start paya-backend
```

#### 2. Revert Migration

```bash
# Revert last migration
npm run migration:revert

# If multiple migrations, revert multiple times
npm run migration:revert
npm run migration:revert
```

### Application Rollback

#### 1. Git Rollback

```bash
# View commit history
git log --oneline -10

# Rollback to previous commit
git checkout <previous_commit_hash>

# Rebuild and restart
npm run build
sudo systemctl restart paya-backend
```

#### 2. PM2 Rollback

```bash
# List previous versions
pm2 list

# Rollback to previous version
pm2 reload paya-backend --update-env

# Or switch to specific version
pm2 stop paya-backend
pm2 start dist/main.js --name paya-backend-rollback
```

#### 3. Docker Rollback

```bash
# List images
docker images | grep paya

# Rollback to previous image
docker stop paya-backend
docker run -d --name paya-backend-rollback paya-backend:previous-tag

# Update load balancer to point to rollback container
```

### Smart Contract Rollback

#### 1. Contract Upgrade

```bash
# Deploy new contract version
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_contract_v2.wasm \
  --source admin \
  --network mainnet

# Update environment to use new contract
# Migrate state from old contract to new contract
# Update references in database
```

#### 2. Emergency Pause

```bash
# Pause contract (if implemented)
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  pause

# Update backend to use paused state
# Notify users of maintenance
```

### Rollback Verification

```bash
# Verify application health
curl https://api.paya.io/api/v1/health

# Verify database integrity
psql -U postgres -d paya -c "SELECT COUNT(*) FROM subscriptions;"

# Verify contract functionality
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  get_admin

# Check logs
pm2 logs paya-backend --lines 100
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U postgres -h localhost -d paya

# Verify environment variables
echo $DATABASE_HOST
echo $DATABASE_PORT
```

#### Redis Connection Failed
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping

# Check logs
sudo journalctl -u redis -f
```

#### Migration Failed
```bash
# Check migration status
npm run migration:show

# Revert failed migration
npm run migration:revert

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Build Failed
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build

# Check Node version
node --version
npm --version
```

## Support

For deployment issues, contact:
- **DevOps Team**: devops@paya.io
- **On-Call**: +1-555-0123 (24/7)
- **Slack**: #paya-ops
