# Paya Platform Maintenance Procedures

## Table of Contents
1. [Regular Maintenance](#regular-maintenance)
2. [Security Updates](#security-updates)
3. [Capacity Planning](#capacity-planning)
4. [Performance Tuning](#performance-tuning)
5. [Cost Optimization](#cost-optimization)

## Regular Maintenance

### Daily Maintenance Tasks

#### Log Rotation and Cleanup

**Schedule**: Daily at 3:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# daily-log-cleanup.sh

# Rotate application logs
logrotate -f /etc/logrotate.d/paya

# Clean old logs (keep 30 days)
find /var/log/paya -name "*.log" -mtime +30 -delete

# Clean PostgreSQL logs
find /var/log/postgresql -name "*.log" -mtime +30 -delete

# Check disk space
df -h | grep -E "(Filesystem|/dev/)"
```

**Verification**:
```bash
# Check log directory size
du -sh /var/log/paya

# Verify logrotate ran
logrotate -d /etc/logrotate.d/paya
```

#### Database Maintenance

**Schedule**: Daily at 4:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# daily-db-maintenance.sh

# Vacuum analyze tables
psql -U postgres -d paya -c "VACUUM ANALYZE;"

# Reindex tables
psql -U postgres -d paya -c "REINDEX DATABASE paya;"

# Update statistics
psql -U postgres -d paya -c "ANALYZE;"

# Check table bloat
psql -U postgres -d paya -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
         n_dead_tup
  FROM pg_stat_user_tables 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

#### Cache Cleanup

**Schedule**: Daily at 5:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# daily-cache-cleanup.sh

# Clear expired Redis keys
redis-cli --scan --pattern "temp:*" | xargs redis-cli DEL

# Clear expired sessions
redis-cli --scan --pattern "session:*" | xargs redis-cli DEL

# Check memory usage
redis-cli INFO memory | grep used_memory_human
```

### Weekly Maintenance Tasks

#### Security Scanning

**Schedule**: Every Sunday at 2:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# weekly-security-scan.sh

# Update package lists
sudo apt update

# Check for security updates
sudo apt list --upgradable

# Run vulnerability scanner
trivy fs /home/paya/backend

# Scan dependencies
cd /home/paya/backend
npm audit

# Check for exposed ports
nmap -sV localhost
```

#### Performance Review

**Schedule**: Every Monday at 9:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# weekly-performance-review.sh

# Check slow queries
psql -U postgres -d paya -c "
  SELECT query, mean_exec_time, calls, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 20;
"

# Check index usage
psql -U postgres -d paya -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan ASC
  LIMIT 10;
"

# Review API response times
curl -s http://localhost:3000/metrics | grep request_duration
```

#### Backup Verification

**Schedule**: Every Wednesday at 3:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# weekly-backup-verification.sh

# Restore latest backup to test database
LATEST_BACKUP=$(ls -t /var/backups/paya/*.sql.gz | head -1)
gunzip -c $LATEST_BACKUP | psql -U postgres -d paya_test

# Verify data integrity
psql -U postgres -d paya_test -c "SELECT COUNT(*) FROM subscriptions;"
psql -U postgres -d paya_test -c "SELECT COUNT(*) FROM payments;"

# Clean up test database
psql -U postgres -c "DROP DATABASE paya_test;"
```

### Monthly Maintenance Tasks

#### System Updates

**Schedule**: First Sunday of each month at 2:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# monthly-system-updates.sh

# Create system snapshot
sudo timeshift --create --comments "Pre-update snapshot"

# Update system packages
sudo apt update
sudo apt upgrade -y

# Update Node.js packages
cd /home/paya/backend
npm update

# Rebuild application
npm run build

# Restart services
sudo systemctl restart paya-backend

# Verify services
sudo systemctl status paya-backend
```

#### Database Schema Review

**Schedule**: Second Sunday of each month at 3:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# monthly-schema-review.sh

# Check for unused indexes
psql -U postgres -d paya -c "
  SELECT schemaname, tablename, indexname
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
"

# Check for table bloat
psql -U postgres -d paya -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check for missing indexes
psql -U postgres -d paya -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE n_distinct > 100
  ORDER BY n_distinct DESC
  LIMIT 20;
"
```

#### Capacity Review

**Schedule**: Last Sunday of each month at 4:00 AM UTC

**Procedure**:
```bash
#!/bin/bash
# monthly-capacity-review.sh

# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | head -20

# Check database size
psql -U postgres -d paya -c "
  SELECT pg_size_pretty(pg_database_size('paya')) AS database_size;
"

# Check Redis memory usage
redis-cli INFO memory

# Review growth trends
# (This would query monitoring system for historical data)
```

## Security Updates

### Vulnerability Management

#### Dependency Scanning

**Schedule**: Daily

**Procedure**:
```bash
# Scan backend dependencies
cd /home/paya/backend
npm audit

# Scan frontend dependencies
cd /home/paya/frontend
npm audit

# Scan smart contract dependencies
cd /home/paya/smartcontracts
cargo audit
```

**Action on Vulnerabilities**:
- **Critical**: Patch within 24 hours
- **High**: Patch within 72 hours
- **Medium**: Patch within 1 week
- **Low**: Patch within 1 month

#### Security Patching

**Procedure**:
```bash
#!/bin/bash
# security-patching.sh

# Check for security updates
sudo apt list --upgradable | grep -i security

# Apply security updates
sudo apt upgrade -y

# Reboot if kernel updated
if [ -f /var/run/reboot-required ]; then
  echo "Reboot required for kernel update"
  # Schedule reboot during maintenance window
fi
```

#### Smart Contract Security

**Procedure**:
```bash
# Audit smart contracts
cd /home/paya/smartcontracts
cargo audit

# Run formal verification (if applicable)
soroban contract inspect --id $CONTRACT_ID --network mainnet

# Check for known vulnerabilities
# (This would query blockchain security services)
```

### Access Control

#### SSH Key Rotation

**Schedule**: Quarterly

**Procedure**:
```bash
#!/bin/bash
# ssh-key-rotation.sh

# Generate new SSH key
ssh-keygen -t ed25519 -C "paya-admin-$(date +%Y%m%d)"

# Add to authorized_keys
# (Manual step: distribute new keys to team)

# Remove old keys after verification
# (Manual step: remove old keys from authorized_keys)
```

#### Database Password Rotation

**Schedule**: Quarterly

**Procedure**:
```bash
#!/bin/bash
# db-password-rotation.sh

# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update PostgreSQL user
psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';"

# Update application .env file
sed -i "s/DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$NEW_PASSWORD/" /home/paya/backend/.env

# Restart application
sudo systemctl restart paya-backend

# Verify connection
PGPASSWORD=$NEW_PASSWORD psql -U postgres -c "SELECT 1;"
```

#### API Key Rotation

**Schedule**: Bi-annually

**Procedure**:
```bash
#!/bin/bash
# api-key-rotation.sh

# Generate new API keys
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_WEBHOOK_SECRET=$(openssl rand -base64 32)

# Update .env file
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" /home/paya/backend/.env
sed -i "s/WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$NEW_WEBHOOK_SECRET/" /home/paya/backend/.env

# Restart application
sudo systemctl restart paya-backend

# Notify webhook subscribers of new secret
# (This would send notification to registered webhooks)
```

## Capacity Planning

### Monitoring Growth Trends

#### Key Metrics to Track

**User Growth**:
- Monthly active users (MAU)
- New user registrations
- User retention rate

**Transaction Growth**:
- Daily transaction volume
- Average transaction size
- Peak transaction rates

**Storage Growth**:
- Database size growth
- File storage growth
- Log storage growth

**Infrastructure Usage**:
- CPU utilization trends
- Memory utilization trends
- Disk space utilization
- Network bandwidth usage

#### Growth Analysis Script

```bash
#!/bin/bash
# growth-analysis.sh

# Get current metrics
CURRENT_USERS=$(psql -U postgres -d paya -t -c "SELECT COUNT(*) FROM users;")
CURRENT_PAYMENTS=$(psql -U postgres -d paya -t -c "SELECT COUNT(*) FROM payments;")
DB_SIZE=$(psql -U postgres -d paya -t -c "SELECT pg_size_pretty(pg_database_size('paya'));")

# Calculate growth rates (from monitoring system)
USER_GROWTH_RATE=$(curl -s http://localhost:9090/api/v1/query?query=rate(paya_users_total[30d]) | jq '.data.result[0].value[1]')
PAYMENT_GROWTH_RATE=$(curl -s http://localhost:9090/api/v1/query?query=rate(paya_payments_total[30d]) | jq '.data.result[0].value[1]')

# Project future capacity needs
# (This would use growth rates to project 3, 6, 12 month needs)

echo "Current Users: $CURRENT_USERS"
echo "Current Payments: $CURRENT_PAYMENTS"
echo "Database Size: $DB_SIZE"
echo "User Growth Rate: $USER_GROWTH_RATE"
echo "Payment Growth Rate: $PAYMENT_GROWTH_RATE"
```

### Scaling Strategies

#### Vertical Scaling

**When to Scale Vertically**:
- Single instance resource exhaustion
- Database CPU/memory bottleneck
- Simple application architecture

**Procedure**:
```bash
# Check current resources
free -h
lscpu
df -h

# Upgrade instance (cloud provider specific)
# AWS: Change instance type
# GCP: Change machine type
# Azure: Resize VM

# Verify new resources
free -h
lscpu
```

#### Horizontal Scaling

**When to Scale Horizontally**:
- High availability requirements
- Load balancing needs
- Microservices architecture

**Procedure**:
```bash
# Scale using Kubernetes
kubectl scale deployment paya-backend --replicas=5

# Or using Docker Swarm
docker service scale paya-backend=5

# Verify scaling
kubectl get pods
docker service ps paya-backend
```

#### Database Scaling

**Read Replicas**:
```bash
# Setup read replica
# (This would be database-specific configuration)

# Update application to use read replicas for reads
# Update connection string to include read replicas
```

**Sharding**:
```bash
# Implement database sharding
# (This would require application changes)
# Shard by user_id, merchant_id, or other logical key
```

### Capacity Planning Checklist

**Monthly Review**:
- [ ] Review growth trends
- [ ] Update capacity forecasts
- [ ] Identify scaling needs
- [ ] Plan infrastructure changes
- [ ] Budget for capacity increases

**Quarterly Review**:
- [ ] Review capacity plan accuracy
- [ ] Adjust scaling strategies
- [ ] Evaluate new technologies
- [ ] Update disaster recovery plan
- [ ] Review cost optimization opportunities

## Performance Tuning

### Database Optimization

#### Query Optimization

**Identify Slow Queries**:
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Review slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Add Missing Indexes**:
```sql
-- Identify missing indexes
SELECT schemaname, tablename, attname, n_distinct
FROM pg_stats
WHERE n_distinct > 100
ORDER BY n_distinct DESC;

-- Create index
CREATE INDEX idx_subscriptions_merchant_status 
ON subscriptions(merchant_id, status);
```

**Optimize Existing Indexes**:
```sql
-- Reindex tables
REINDEX TABLE subscriptions;
REINDEX INDEX idx_subscriptions_merchant_status;

-- Analyze tables
ANALYZE subscriptions;
```

#### Connection Pooling

**Configure PgBouncer**:
```bash
# Install PgBouncer
sudo apt install pgbouncer

# Configure PgBouncer
sudo vim /etc/pgbouncer/pgbouncer.ini
```

```ini
[databases]
paya = host=localhost port=5432 dbname=paya

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode =  transaction
max_client_conn = 1000
default_pool_size = 25
```

```bash
# Start PgBouncer
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer

# Update application to use PgBouncer
# Change DATABASE_PORT from 5432 to 6432
```

### Application Optimization

#### Caching Strategy

**Redis Caching**:
```typescript
// cache.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });
  }

  async get(key: string): Promise<any> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**Cache Invalidation Strategy**:
- Time-based expiration
- Event-based invalidation
- Write-through caching
- Cache warming

#### Load Balancing

**Nginx Configuration**:
```nginx
upstream paya_backend {
    least_conn;
    server backend1:3000 weight=3;
    server backend2:3000 weight=2;
    server backend3:3000 weight=1;
    keepalive 32;
}

server {
    listen 80;
    server_name api.paya.io;

    location / {
        proxy_pass http://paya_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Enable caching
        proxy_cache_bypass $http_upgrade;
        proxy_cache my_cache;
        proxy_cache_valid 200 5m;
    }
}
```

### Infrastructure Optimization

#### CDN Configuration

**Setup Cloudflare CDN**:
```bash
# Configure Cloudflare for static assets
# - Enable caching for /static/* paths
# - Set cache TTL to 1 hour
# - Enable Brotli compression
# - Enable HTTP/3
```

#### Image Optimization

**Setup Image CDN**:
```bash
# Use Cloudinary or similar service
# - Automatically optimize images
# - Serve WebP format
# - Responsive images
# - Lazy loading
```

## Cost Optimization

### Cost Monitoring

#### Track Costs by Service

```bash
#!/bin/bash
# cost-monitoring.sh

# AWS Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type,DIMENSION_TYPE

# GCP Billing
gcloud billing accounts list
gcloud billing projects describe paya-production

# Azure Cost Management
az consumption list --include-meter-details
```

#### Cost Alerts

**Setup Budget Alerts**:
```bash
# AWS Budget
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json

# GCP Budget
gcloud billing budgets create \
  --billing-account-id 0X0X0X-0X0X0X-0X0X0X \
  --budget-amount 1000.00 \
  --threshold-rule percentage=80
```

### Optimization Strategies

#### Right-Sizing Instances

**Analyze Instance Usage**:
```bash
#!/bin/bash
# analyze-instance-usage.sh

# Get CPU utilization over 30 days
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --start-time $(date -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average

# Get memory utilization
# (This would require CloudWatch agent)
```

**Downsize Underutilized Instances**:
```bash
# If average CPU < 20% for 30 days, consider downsizing
# If average memory < 50% for 30 days, consider downsizing
```

#### Reserved Instances

**Purchase Reserved Instances**:
```bash
# For predictable workloads
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 3 \
  --instance-type t3.large
```

#### Spot Instances

**Use Spot Instances for Non-Critical Workloads**:
```bash
# For batch processing, testing, etc.
aws ec2 request-spot-fleet \
  --spot-fleet-request-config file://spot-config.json
```

#### Storage Optimization

**Lifecycle Policies**:
```bash
# S3 Lifecycle Policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket paya-backups \
  --lifecycle-configuration file://lifecycle.json
```

```json
{
  "Rules": [
    {
      "ID": "MoveToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### Cost Reduction Checklist

**Monthly Review**:
- [ ] Review cost by service
- [ ] Identify cost anomalies
- [ ] Review reserved instance utilization
- [ ] Check for unused resources
- [ ] Review storage costs
- [ ] Optimize data transfer costs

**Quarterly Review**:
- [ ] Review overall cost trends
- [ ] Evaluate pricing models
- [ ] Consider alternative providers
- [ ] Review contract terms
- [ ] Optimize support plans

## Support

For maintenance issues, contact:
- **DevOps Team**: devops@paya.io
- **On-Call**: +1-555-0123 (24/7)
- **Slack**: #paya-ops
