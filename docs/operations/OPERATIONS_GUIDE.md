# Paya Platform Operations Guide

## Table of Contents
1. [Service Startup/Shutdown](#service-startupshutdown)
2. [Configuration Management](#configuration-management)
3. [Backup and Restore](#backup-and-restore)
4. [Log Management](#log-management)
5. [Monitoring Setup](#monitoring-setup)
6. [Health Checks](#health-checks)

## Service Startup/Shutdown

### Backend Service

#### Start Backend Service

**Using Systemd:**
```bash
# Start service
sudo systemctl start paya-backend

# Enable auto-start on boot
sudo systemctl enable paya-backend

# Check status
sudo systemctl status paya-backend
```

**Using PM2:**
```bash
# Start service
pm2 start dist/main.js --name paya-backend

# Start with ecosystem file
pm2 start ecosystem.config.js

# Enable auto-start on boot
pm2 startup
pm2 save
```

**Using Docker:**
```bash
# Start container
docker start paya-backend

# Start with docker-compose
docker-compose up -d backend
```

#### Stop Backend Service

**Using Systemd:**
```bash
# Stop service
sudo systemctl stop paya-backend

# Check if stopped
sudo systemctl status paya-backend
```

**Using PM2:**
```bash
# Stop service
pm2 stop paya-backend

# Stop all services
pm2 stop all
```

**Using Docker:**
```bash
# Stop container
docker stop paya-backend

# Stop with docker-compose
docker-compose down
```

#### Graceful Shutdown

```bash
# Send SIGTERM for graceful shutdown
sudo systemctl kill -s SIGTERM paya-backend

# Or using PM2
pm2 gracefulReload paya-backend

# Wait for in-flight requests to complete
sleep 30
```

### Frontend Service

#### Start Frontend Service

**Using Nginx:**
```bash
# Start Nginx
sudo systemctl start nginx

# Enable auto-start
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

**Using Docker:**
```bash
# Start container
docker start paya-frontend

# Start with docker-compose
docker-compose up -d frontend
```

#### Stop Frontend Service

```bash
# Stop Nginx
sudo systemctl stop nginx

# Stop Docker container
docker stop paya-frontend
```

### Redis Service

#### Start Redis

```bash
# Using Systemd
sudo systemctl start redis

# Using Docker
docker start paya-redis

# Check status
redis-cli ping
```

#### Stop Redis

```bash
# Using Systemd
sudo systemctl stop redis

# Using Docker
docker stop paya-redis
```

### PostgreSQL Service

#### Start PostgreSQL

```bash
# Using Systemd
sudo systemctl start postgresql

# Check status
sudo systemctl status postgresql

# Verify connection
psql -U postgres -c "SELECT version();"
```

#### Stop PostgreSQL

```bash
# Using Systemd
sudo systemctl stop postgresql

# Check if stopped
sudo systemctl status postgresql
```

### Complete Service Startup Sequence

```bash
#!/bin/bash
# start-all-services.sh

echo "Starting Paya Platform Services..."

# Start PostgreSQL
echo "Starting PostgreSQL..."
sudo systemctl start postgresql
sleep 5

# Start Redis
echo "Starting Redis..."
sudo systemctl start redis
sleep 2

# Start Backend
echo "Starting Backend..."
sudo systemctl start paya-backend
sleep 5

# Start Frontend
echo "Starting Frontend..."
sudo systemctl start nginx

echo "All services started successfully"

# Verify services
echo "Verifying services..."
sudo systemctl status postgresql | grep "active (running)"
sudo systemctl status redis | grep "active (running)"
sudo systemctl status paya-backend | grep "active (running)"
sudo systemctl status nginx | grep "active (running)"
```

### Complete Service Shutdown Sequence

```bash
#!/bin/bash
# stop-all-services.sh

echo "Stopping Paya Platform Services..."

# Stop Frontend first (no dependencies)
echo "Stopping Frontend..."
sudo systemctl stop nginx

# Stop Backend
echo "Stopping Backend..."
sudo systemctl stop paya-backend

# Stop Redis
echo "Stopping Redis..."
sudo systemctl stop redis

# Stop PostgreSQL last
echo "Stopping PostgreSQL..."
sudo systemctl stop postgresql

echo "All services stopped successfully"
```

## Configuration Management

### Environment Variables

#### Backend Environment Variables

Create `.env` file in backend directory:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=paya
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Stellar Network
STELLAR_NETWORK=mainnet
STELLAR_HORIZON_URL=https://horizon.stellar.org
SOROBAN_RPC_URL=https://soroban.stellar.org

# Smart Contracts
PAYMENT_CONTRACT_ID=your_contract_id
SUBSCRIPTION_CONTRACT_ID=your_contract_id

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRATION=7d

# Email
EMAIL_FROM=noreply@paya.io
SENDGRID_API_KEY=your_sendgrid_api_key

# Webhook
WEBHOOK_SECRET=your_webhook_secret

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=https://paya.io
```

#### Frontend Environment Variables

Create `.env` file in frontend directory:

```bash
# API
VITE_API_URL=https://api.paya.io
VITE_WS_URL=wss://api.paya.io

# Stellar
VITE_STELLAR_NETWORK=mainnet
VITE_STELLAR_HORIZON_URL=https://horizon.stellar.org

# Features
VITE_ENABLE_SUBSCRIPTIONS=true
VITE_ENABLE_ESCROW=true
```

### Secrets Management

#### Using HashiCorp Vault

```bash
# Install Vault
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install vault

# Start Vault
vault server -dev

# Store secrets
vault kv put secret/paya/database \
  user=postgres \
  password=your_password

vault kv put secret/paya/jwt \
  secret=your_jwt_secret

# Retrieve secrets
vault kv get secret/paya/database
```

#### Using AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name paya/database \
  --secret-string '{"user":"postgres","password":"your_password"}'

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id paya/database
```

#### Using Environment File Encryption

```bash
# Install sops
brew install sops  # macOS
# or
wget https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux.amd64 -O sops
chmod +x sops
sudo mv sops /usr/local/bin/

# Encrypt .env file
sops --encrypt --kms "arn:aws:kms:us-east-1:123456789012:key/abcd1234" .env > .env.enc

# Decrypt .env file
sops --decrypt .env.enc > .env
```

### Configuration Validation

#### Validate Environment Variables

```bash
#!/bin/bash
# validate-env.sh

required_vars=(
  "DATABASE_HOST"
  "DATABASE_PASSWORD"
  "JWT_SECRET"
  "STELLAR_NETWORK"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
don

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "Missing required environment variables:"
  printf '%s\n' "${missing_vars[@]}"
  exit 1
fi

echo "All required environment variables are set"
```

#### Test Database Connection

```bash
#!/bin/bash
# test-db-connection.sh

PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;"

if [ $? -eq 0 ]; then
  echo "Database connection successful"
else
  echo "Database connection failed"
  exit 1
fi
```

### Configuration Updates

#### Update Configuration Without Restart

```bash
# Using PM2 with ecosystem file
pm2 reload paya-backend --update-env

# Or restart gracefully
pm2 gracefulReload paya-backend
```

#### Update Configuration with Restart

```bash
# Update .env file
vim .env

# Restart service
sudo systemctl restart paya-backend

# Verify new configuration
pm2 env 0
```

## Backup and Restore

### Database Backup

#### Automated Daily Backup

Create `/etc/cron.daily/paya-backup.sh`:
```bash
#!/bin/bash
# Daily database backup

BACKUP_DIR=/var/backups/paya
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE=$BACKUP_DIR/paya_$DATE.sql

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
PGPASSWORD=$DATABASE_PASSWORD pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "paya_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE.gz s3://paya-backups/database/

echo "Backup completed: $BACKUP_FILE.gz"
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/paya-backup.sh
```

#### Manual Backup

```bash
# Full backup
pg_dump -U postgres -h localhost -d paya > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U postgres -h localhost -d paya | gzip > backup_$(date +%Y%m%d).sql.gz

# Schema only
pg_dump -U postgres -h localhost -d paya --schema-only > schema_$(date +%Y%m%d).sql

# Data only
pg_dump -U postgres -h localhost -d paya --data-only > data_$(date +%Y%m%d).sql
```

#### Backup Specific Tables

```bash
# Backup specific table
pg_dump -U postgres -h localhost -d paya -t subscriptions > subscriptions_backup.sql

# Backup multiple tables
pg_dump -U postgres -h localhost -d paya -t subscriptions -t invoices > backup.sql
```

### Configuration Backup

```bash
#!/bin/bash
# Backup configuration files

BACKUP_DIR=/var/backups/paya/config
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup environment files
cp /home/paya/backend/.env $BACKUP_DIR/.env_$DATE
cp /home/paya/frontend/.env $BACKUP_DIR/frontend.env_$DATE

# Backup Nginx configuration
cp /etc/nginx/sites-available/paya $BACKUP_DIR/nginx_$DATE

# Backup systemd service files
cp /etc/systemd/system/paya-backend.service $BACKUP_DIR/paya-backend.service_$DATE

# Compress
tar -czf $BACKUP_DIR/config_$DATE.tar.gz $BACKUP_DIR/*_$DATE

# Cleanup old backups
find $BACKUP_DIR -name "config_*.tar.gz" -mtime +30 -delete
```

### Restore Procedures

#### Restore Database from Backup

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Stop application
sudo systemctl stop paya-backend

# Restore database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql -U postgres -d paya
else
  psql -U postgres -d paya < $BACKUP_FILE
fi

# Start application
sudo systemctl start paya-backend

echo "Database restored from $BACKUP_FILE"
```

Usage:
```bash
./restore-database.sh /var/backups/paya/paya_20240101.sql.gz
```

#### Point-in-Time Recovery

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Configure recovery in postgresql.conf
echo "restore_command = 'cp /var/lib/postgresql/14/main/archive/%f %p'" >> /etc/postgresql/14/main/postgresql.conf
echo "recovery_target_time = '2024-01-01 12:00:00'" >> /etc/postgresql/14/main/postgresql.conf

# Create recovery signal
touch /var/lib/postgresql/14/main/recovery.signal

# Start PostgreSQL
sudo systemctl start postgresql

# Monitor recovery
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Restore Configuration

```bash
# Extract backup
tar -xzf /var/backups/paya/config/config_20240101.tar.gz -C /tmp

# Restore environment files
cp /tmp/.env_20240101 /home/paya/backend/.env
cp /tmp/frontend.env_20240101 /home/paya/frontend/.env

# Restore Nginx configuration
cp /tmp/nginx_20240101 /etc/nginx/sites-available/paya
sudo nginx -t
sudo systemctl reload nginx

# Restore systemd service
cp /tmp/paya-backend.service_20240101 /etc/systemd/system/paya-backend.service
sudo systemctl daemon-reload
sudo systemctl restart paya-backend
```

### Backup Verification

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Restore to test database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql -U postgres -d paya_test
else
  psql -U postgres -d paya_test < $BACKUP_FILE
fi

# Verify table count
TABLE_COUNT=$(psql -U postgres -d paya_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo "Backup verified: $TABLE_COUNT tables restored"

# Clean up test database
psql -U postgres -c "DROP DATABASE paya_test;"
```

## Log Management

### Log Locations

#### Backend Logs

**Systemd:**
```bash
# View logs
sudo journalctl -u paya-backend -f

# View last 100 lines
sudo journalctl -u paya-backend -n 100

# View logs since specific time
sudo journalctl -u paya-backend --since "2024-01-01 00:00:00"
```

**PM2:**
```bash
# View logs
pm2 logs paya-backend

# View last 100 lines
pm2 logs paya-backend --lines 100

# View error logs only
pm2 logs paya-backend --err
```

**Docker:**
```bash
# View logs
docker logs -f paya-backend

# View last 100 lines
docker logs --tail 100 paya-backend
```

#### Application Logs

```bash
# Application logs directory
/var/log/paya/

# Error log
/var/log/paya/error.log

# Access log
/var/log/paya/access.log

# Payment log
/var/log/paya/payments.log
```

#### Database Logs

```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# PostgreSQL error log
sudo tail -f /var/log/postgresql/postgresql-14-main.err
```

#### Nginx Logs

```bash
# Access log
sudo tail -f /var/log/nginx/paya-access.log

# Error log
sudo tail -f /var/log/nginx/paya-error.log
```

### Log Rotation

#### Configure Logrotate for Application Logs

Create `/etc/logrotate.d/paya`:
```
/var/log/paya/*.log {
  daily
  rotate 30
  compress
  delaycompress
  notifempty
  create 0640 paya paya
  sharedscripts
  postrotate
    systemctl reload paya-backend > /dev/null 2>&1 || true
  endscript
}
```

Test logrotate:
```bash
sudo logrotate -d /etc/logrotate.d/paya
sudo logrotate -f /etc/logrotate.d/paya
```

#### Configure PostgreSQL Log Rotation

Edit `/etc/postgresql/14/main/postgresql.conf`:
```
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_truncate_on_rotation = on
```

### Log Aggregation

#### Using ELK Stack

```bash
# Install Filebeat
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee -a /etc/apt/sources.list.d/elastic-7.x.list
sudo apt update && sudo apt install filebeat

# Configure Filebeat
sudo vim /etc/filebeat/filebeat.yml

# Enable modules
sudo filebeat modules enable system nginx

# Start Filebeat
sudo systemctl start filebeat
sudo systemctl enable filebeat
```

#### Using Loki

```bash
# Install Promtail
wget https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail

# Configure Promtail
sudo vim /etc/promtail/config.yml

# Start Promtail
sudo systemctl start promtail
```

### Log Analysis

#### Search Logs for Errors

```bash
# Search for errors in backend logs
sudo journalctl -u paya-backend | grep -i error

# Search for specific error code
sudo journalctl -u paya-backend | grep "500"

# Search for payment failures
grep -i "payment.*failed" /var/log/paya/payments.log
```

#### Analyze Access Patterns

```bash
# Count requests by endpoint
awk '{print $7}' /var/log/nginx/paya-access.log | sort | uniq -c | sort -rn

# Find slow requests
awk '$11 > 1.0 {print $0}' /var/log/nginx/paya-access.log

# Find 5xx errors
grep " 5" /var/log/nginx/paya-access.log | awk '{print $9}' | sort | uniq -c
```

## Monitoring Setup

### Application Monitoring

#### Install Prometheus

```bash
# Add Prometheus repository
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# Install Prometheus
sudo apt update
sudo apt install prometheus

# Configure Prometheus
sudo vim /etc/prometheus/prometheus.yml

# Start Prometheus
sudo systemctl start prometheus
sudo systemctl enable prometheus
```

#### Configure Prometheus for Paya

Edit `/etc/prometheus/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'paya-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

#### Install Node Exporter

```bash
# Download and install
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.0/node_exporter-1.6.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.0.linux-amd64.tar.gz
sudo mv node_exporter-1.6.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo vim /etc/systemd/system/node_exporter.service
```

Content:
```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=node_exporter
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Start Node Exporter
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### Health Checks

#### Backend Health Check Endpoint

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }
}
```

#### Database Health Check

```bash
#!/bin/bash
# check-db-health.sh

# Check PostgreSQL status
sudo systemctl status postgresql | grep "active (running)" > /dev/null
if [ $? -eq 0 ]; then
  echo "PostgreSQL is running"
else
  echo "PostgreSQL is not running"
  exit 1
fi

# Check connection
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;" > /dev/null
if [ $? -eq 0 ]; then
  echo "Database connection successful"
else
  echo "Database connection failed"
  exit 1
fi

# Check replication lag (if applicable)
LAG=$(psql -U postgres -d paya -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;")
if [ $LAG -lt 5 ]; then
  echo "Replication lag acceptable: ${LAG}s"
else
  echo "Replication lag too high: ${LAG}s"
  exit 1
fi
```

#### Redis Health Check

```bash
#!/bin/bash
# check-redis-health.sh

# Check Redis status
sudo systemctl status redis | grep "active (running)" > /dev/null
if [ $? -eq 0 ]; then
  echo "Redis is running"
else
  echo "Redis is not running"
  exit 1
fi

# Check connection
redis-cli ping > /dev/null
if [ $? -eq 0 ]; then
  echo "Redis connection successful"
else
  echo "Redis connection failed"
  exit 1
fi

# Check memory usage
MEMORY=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
echo "Redis memory usage: $MEMORY"
```

#### Stellar Network Health Check

```bash
#!/bin/bash
# check-stellar-health.sh

# Check Horizon API
curl -s https://horizon.stellar.org/ > /dev/null
if [ $? -eq 0 ]; then
  echo "Horizon API is accessible"
else
  echo "Horizon API is not accessible"
  exit 1
fi

# Check Soroban RPC
curl -s https://soroban.stellar.org/ > /dev/null
if [ $? -eq 0 ]; then
  echo "Soroban RPC is accessible"
else
  echo "Soroban RPC is not accessible"
  exit 1
fi
```

#### Comprehensive Health Check

```bash
#!/bin/bash
# comprehensive-health-check.sh

echo "Running comprehensive health check..."

# Check services
services=("postgresql" "redis" "paya-backend" "nginx")
for service in "${services[@]}"; do
  sudo systemctl status $service | grep "active (running)" > /dev/null
  if [ $? -eq 0 ]; then
    echo "✓ $service is running"
  else
    echo "✗ $service is not running"
  fi
done

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
  echo "✓ Disk usage: ${DISK_USAGE}%"
else
  echo "✗ Disk usage critical: ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3/$2*100}')
if [ $MEM_USAGE -lt 80 ]; then
  echo "✓ Memory usage: ${MEM_USAGE}%"
else
  echo "✗ Memory usage critical: ${MEM_USAGE}%"
fi

# Check API health
curl -s http://localhost:3000/api/v1/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✓ API is responding"
else
  echo "✗ API is not responding"
fi

echo "Health check completed"
```

### Automated Health Checks

#### Setup Cron Job for Health Checks

```bash
# Add to crontab
crontab -e

# Run health check every 5 minutes
*/5 * * * * /home/paya/scripts/comprehensive-health-check.sh >> /var/log/paya/health-check.log 2>&1

# Run database backup daily at 2 AM
0 2 * * * /etc/cron.daily/paya-backup.sh
```

#### Setup Uptime Monitoring

Using UptimeRobot:
1. Create account at https://uptimerobot.com
2. Add monitor for https://api.paya.io/api/v1/health
3. Configure alert notifications (email, Slack, SMS)
4. Set check interval to 1 minute

Using StatusCake:
1. Create account at https://www.statuscake.com
2. Add uptime test for https://api.paya.io
3. Configure alert thresholds
4. Set up public status page

## Support

For operations issues, contact:
- **DevOps Team**: devops@paya.io
- **On-Call**: +1-555-0123 (24/7)
- **Slack**: #paya-ops
