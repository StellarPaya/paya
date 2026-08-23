# Paya Platform Runbooks

## Table of Contents
1. [Service Outage](#service-outage)
2. [Database Issues](#database-issues)
3. [Payment Processing Failures](#payment-processing-failures)
4. [High Error Rates](#high-error-rates)
5. [Performance Degradation](#performance-degradation)
6. [Security Incident](#security-incident)
7. [Smart Contract Issues](#smart-contract-issues)
8. [Webhook Delivery Failures](#webhook-delivery-failures)

## Service Outage

### Symptoms
- API returning 5xx errors
- Service completely unavailable
- Health check endpoint failing
- All endpoints timing out

### Initial Assessment
```bash
# Check service status
sudo systemctl status paya-backend

# Check if service is running
ps aux | grep node

# Check port availability
netstat -tlnp | grep 3000

# Check health endpoint
curl http://localhost:3000/api/v1/health
```

### Troubleshooting Steps

#### 1. Check Application Logs
```bash
# View recent logs
sudo journalctl -u paya-backend -n 100

# Check for errors
sudo journalctl -u paya-backend | grep -i error

# Check application logs
tail -100 /var/log/paya/error.log
```

#### 2. Check Dependencies
```bash
# Check PostgreSQL
sudo systemctl status postgresql
psql -U postgres -c "SELECT 1;"

# Check Redis
sudo systemctl status redis
redis-cli ping

# Check Stellar Network
curl -s https://horizon.stellar.org/ > /dev/null
```

#### 3. Check System Resources
```bash
# Check CPU
top -bn1 | head -20

# Check memory
free -h

# Check disk space
df -h

# Check open file descriptors
ulimit -n
```

### Resolution Steps

#### Scenario 1: Service Crashed
```bash
# Restart service
sudo systemctl restart paya-backend

# Monitor startup
sudo journalctl -u paya-backend -f

# Verify health
curl http://localhost:3000/api/v1/health
```

#### Scenario 2: Out of Memory
```bash
# Check memory usage
free -h

# Restart service
sudo systemctl restart paya-backend

# Consider increasing memory limits
# Update systemd service file with MemoryLimit
```

#### Scenario 3: Disk Full
```bash
# Check disk usage
df -h

# Clean up old logs
find /var/log/paya -name "*.log" -mtime +30 -delete

# Clean up old backups
find /var/backups/paya -name "*.sql.gz" -mtime +30 -delete

# Clean up npm cache
npm cache clean --force
```

#### Scenario 4: Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection settings
cat /home/paya/backend/.env | grep DATABASE

# Test connection
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;"
```

### Prevention
- Set up monitoring alerts for service downtime
- Implement auto-restart policies
- Regular resource monitoring
- Log rotation to prevent disk full

## Database Issues

### Symptoms
- Database connection errors
- Slow query performance
- Connection pool exhaustion
- Database locks

### Initial Assessment
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection count
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check long-running queries
psql -U postgres -d paya -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Check locks
psql -U postgres -d paya -c "
  SELECT * FROM pg_locks 
  WHERE NOT granted;
"
```

### Troubleshooting Steps

#### 1. Check Database Logs
```bash
# View PostgreSQL logs
sudo tail -100 /var/log/postgresql/postgresql-14-main.log

# Check for errors
sudo tail -100 /var/log/postgresql/postgresql-14-main.log | grep -i error
```

#### 2. Check Table Bloat
```bash
psql -U postgres -d paya -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

#### 3. Check Index Usage
```bash
psql -U postgres -d paya -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan ASC
  LIMIT 10;
"
```

### Resolution Steps

#### Scenario 1: Connection Pool Exhausted
```bash
# Check max connections
psql -U postgres -c "SHOW max_connections;"

# Check current connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < now() - interval '1 hour';
"

# Increase max_connections if needed
# Edit postgresql.conf and restart
```

#### Scenario 2: Long-Running Query
```bash
# Identify long-running query
psql -U postgres -d paya -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Kill query if necessary
psql -U postgres -c "SELECT pg_terminate_backend(<pid>);"

# Optimize query
# Add indexes, rewrite query, etc.
```

#### Scenario 3: Database Locks
```bash
# Check locks
psql -U postgres -d paya -c "
  SELECT * FROM pg_locks 
  WHERE NOT granted;
"

# Identify blocking query
psql -U postgres -d paya -c "
  SELECT blocked_locks.pid AS blocked_pid,
         blocked_activity.usename AS blocked_user,
         blocking_locks.pid AS blocking_pid,
         blocking_activity.usename AS blocking_user,
         blocked_activity.query AS blocked_statement,
         blocking_activity.query AS current_statement_in_blocking_process,
         blocked_activity.application_name AS blocked_application,
         blocking_activity.application_name AS blocking_application
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.virtualtransaction IS NOT DISTINCT FROM blocked_locks.virtualtransaction
  JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.GRANTED;
"

# Kill blocking query
psql -U postgres -c "SELECT pg_terminate_backend(<blocking_pid>);"
```

#### Scenario 4: Table Bloat
```bash
# Vacuum the table
psql -U postgres -d paya -c "VACUUM FULL <tablename>;"

# Reindex the table
psql -U postgres -d paya -c "REINDEX TABLE <tablename>;"

# Analyze the table
psql -U postgres -d paya -c "ANALYZE <tablename>;"
```

### Prevention
- Regular VACUUM and ANALYZE
- Monitor connection pool usage
- Add appropriate indexes
- Optimize slow queries
- Set up connection limits

## Payment Processing Failures

### Symptoms
- Payment transactions failing
- High payment error rate
- Stellar transaction timeouts
- Payment confirmation delays

### Initial Assessment
```bash
# Check payment error rate
curl -s http://localhost:3000/metrics | grep payment_failure

# Check Stellar network status
curl -s https://horizon.stellar.org/

# Check recent payment logs
grep -i "payment.*failed" /var/log/paya/payments.log | tail -50
```

### Troubleshooting Steps

#### 1. Check Stellar Network
```bash
# Check Horizon API
curl -s https://horizon.stellar.org/ | jq '.history_latest_ledger'

# Check Soroban RPC
curl -s https://soroban.stellar.org/

# Check network status
curl -s https://api.stellar.org/ | jq '.network_passphrase'
```

#### 2. Check Smart Contract
```bash
# Check contract status
soroban contract inspect --id $PAYMENT_CONTRACT_ID --network mainnet

# Check contract balance
soroban contract invoke \
  --id $PAYMENT_CONTRACT_ID \
  --source admin \
  --network mainnet \
  get_balance
```

#### 3. Check Payment Service Logs
```bash
# View payment service logs
sudo journalctl -u paya-backend | grep -i payment

# Check for specific errors
grep -i "stellar.*error" /var/log/paya/error.log | tail -50
```

### Resolution Steps

#### Scenario 1: Stellar Network Down
```bash
# Verify network status
curl -s https://horizon.stellar.org/

# If network is down, wait for recovery
# Monitor network status
# Notify users of network issues

# Update status page
curl -X POST https://status.paya.io/api/update \
  -d '{"status":"degraded","message":"Stellar network experiencing issues"}'
```

#### Scenario 2: Smart Contract Issue
```bash
# Check contract status
soroban contract inspect --id $PAYMENT_CONTRACT_ID --network mainnet

# If contract is paused, unpause it
soroban contract invoke \
  --id $PAYMENT_CONTRACT_ID \
  --source admin \
  --network mainnet \
  unpause

# If contract has error, investigate and fix
# May require contract upgrade
```

#### Scenario 3: Insufficient Funds
```bash
# Check platform account balance
soroban account balance --id $PLATFORM_ACCOUNT_ID --network mainnet

# If low, fund the account
soroban account fund --id $PLATFORM_ACCOUNT_ID --network mainnet

# Monitor balance regularly
```

#### Scenario 4: Transaction Timeout
```bash
# Check transaction status
soroban transaction status --tx <transaction_id> --network mainnet

# If transaction is stuck, may need to retry
# Implement retry logic with exponential backoff
```

### Prevention
- Monitor Stellar network status
- Maintain adequate platform account balance
- Implement transaction retry logic
- Set up alerts for payment failures
- Regular smart contract audits

## High Error Rates

### Symptoms
- API error rate > 5%
- 5xx errors increasing
- Application errors in logs
- User complaints about errors

### Initial Assessment
```bash
# Check error rate
curl -s http://localhost:3000/metrics | grep error_rate

# Check 5xx errors
curl -s http://localhost:3000/metrics | grep "status=\"5"

# Check error logs
tail -100 /var/log/paya/error.log
```

### Troubleshooting Steps

#### 1. Identify Error Pattern
```bash
# Check error distribution
curl -s http://localhost:3000/metrics | grep error | sort

# Check recent errors
grep -i error /var/log/paya/error.log | tail -100 | awk '{print $NF}' | sort | uniq -c

# Check specific endpoint errors
grep "POST /api/v1/payments" /var/log/paya/access.log | grep " 5"
```

#### 2. Check Recent Changes
```bash
# Check recent deployments
git log --oneline -5

# Check recent configuration changes
git diff HEAD~1 .env

# Check recent database changes
psql -U postgres -d paya -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Resolution Steps

#### Scenario 1: Recent Deployment Causing Errors
```bash
# Rollback deployment
git checkout <previous_commit>
npm run build
sudo systemctl restart paya-backend

# Verify fix
curl http://localhost:3000/api/v1/health
```

#### Scenario 2: Database Schema Issue
```bash
# Check for missing columns
psql -U postgres -d paya -c "\d subscriptions"

# Revert last migration
npm run migration:revert

# Verify fix
curl http://localhost:3000/api/v1/subscriptions
```

#### Scenario 3: Third-Party Service Failure
```bash
# Check third-party service status
curl -s https://status.sendgrid.com/
curl -s https://status.stellar.org/

# If third-party is down, implement circuit breaker
# Disable failing feature
curl -X POST https://api.paya.io/api/v1/features/disable \
  -d '{"feature":"email_notifications"}'
```

#### Scenario 4: Resource Exhaustion
```bash
# Check system resources
free -h
df -h
top -bn1 | head -20

# Scale resources if needed
# Add more instances
# Increase instance size
```

### Prevention
- Implement feature flags
- Use circuit breakers
- Monitor error rates
- Test deployments on staging
- Implement gradual rollouts

## Performance Degradation

### Symptoms
- Slow response times
- High latency
- Timeouts
- User complaints about slowness

### Initial Assessment
```bash
# Check response times
curl -s http://localhost:3000/metrics | grep request_duration

# Check P95 latency
curl -s http://localhost:3000/metrics | grep "quantile=\"0.95"

# Check database query times
psql -U postgres -d paya -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

### Troubleshooting Steps

#### 1. Check Database Performance
```bash
# Check slow queries
psql -U postgres -d paya -c "
  SELECT query, mean_exec_time, calls, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 20;
"

# Check cache hit ratio
psql -U postgres -d paya -c "
  SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
  FROM pg_statio_user_tables;
"

# Check connection count
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 2. Check Cache Performance
```bash
# Check Redis hit rate
redis-cli INFO stats | grep keyspace

# Check Redis memory
redis-cli INFO memory

# Check Redis slow log
redis-cli SLOWLOG GET 10
```

#### 3. Check Application Performance
```bash
# Check CPU usage
top -bn1 | grep node

# Check memory usage
ps aux | grep node | awk '{print $4}'

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/payments
```

### Resolution Steps

#### Scenario 1: Slow Database Queries
```bash
# Identify slow query
psql -U postgres -d paya -c "
  SELECT query, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 1;
"

# Add index if needed
CREATE INDEX idx_<table>_<column> ON <table>(<column>);

# Optimize query
# Rewrite query to use indexes
# Add caching
```

#### Scenario 2: Low Cache Hit Rate
```bash
# Check Redis hit rate
redis-cli INFO stats | grep keyspace

# Increase cache size if needed
# Update redis.conf with maxmemory

# Warm cache
# Pre-load frequently accessed data
```

#### Scenario 3: High CPU Usage
```bash
# Check CPU usage
top -bn1 | head -20

# Scale horizontally
kubectl scale deployment paya-backend --replicas=5

# Or scale vertically (increase instance size)
```

#### Scenario 4: Memory Leak
```bash
# Check memory usage
free -h
ps aux | grep node | awk '{print $4}'

# Restart service
sudo systemctl restart paya-backend

# Investigate memory leak
# Use heap profiling tools
# Fix memory leak in code
```

### Prevention
- Regular performance monitoring
- Database query optimization
- Implement caching
- Load testing
- Capacity planning

## Security Incident

### Symptoms
- Unauthorized access attempts
- Data breach indicators
- Suspicious activity
- Security alerts triggered

### Initial Assessment
```bash
# Check authentication logs
grep -i "auth" /var/log/paya/access.log | tail -100

# Check failed login attempts
grep -i "401\|403" /var/log/paya/access.log | tail -100

# Check for suspicious IP addresses
awk '{print $1}' /var/log/paya/access.log | sort | uniq -c | sort -rn | head -20
```

### Troubleshooting Steps

#### 1. Identify Scope
```bash
# Check affected accounts
psql -U postgres -d paya -c "
  SELECT user_id, COUNT(*) 
  FROM auth_logs 
  WHERE success = false 
  AND created_at > now() - interval '1 hour'
  GROUP BY user_id 
  HAVING COUNT(*) > 10;
"

# Check data access logs
grep -i "SELECT\|UPDATE\|DELETE" /var/log/paya/query.log | tail -100
```

#### 2. Contain Incident
```bash
# Block suspicious IPs
iptables -A INPUT -s <suspicious_ip> -j DROP

# Disable affected accounts
psql -U postgres -d paya -c "UPDATE users SET status = 'disabled' WHERE user_id = '<affected_user>';"

# Revoke compromised sessions
redis-cli DEL "session:<session_id>"
```

### Resolution Steps

#### Scenario 1: Brute Force Attack
```bash
# Identify attacking IPs
awk '{print $1}' /var/log/paya/access.log | sort | uniq -c | sort -rn | head -20

# Block IPs
iptables -A INPUT -s <attacking_ip> -j DROP

# Implement rate limiting
# Add to Nginx config:
# limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
# limit_req zone=api burst=20 nodelay;
```

#### Scenario 2: Data Breach
```bash
# Identify affected data
psql -U postgres -d paya -c "
  SELECT * FROM users 
  WHERE last_login > now() - interval '24 hours'
  AND last_login < now() - interval '1 hour';
"

# Notify affected users
# Send security alert emails

# Reset passwords
psql -U postgres -d paya -c "UPDATE users SET password_reset_required = true WHERE user_id IN (...);"

# Audit logs
# Preserve evidence for investigation
```

#### Scenario 3: DDoS Attack
```bash
# Check traffic spike
netstat -an | grep :3000 | wc -l

# Enable rate limiting
# Configure Nginx or cloud provider DDoS protection

# Block attacking IPs
iptables -A INPUT -s <attacking_ip> -j DROP

# Enable CDN protection
# Configure Cloudflare or similar
```

### Prevention
- Implement rate limiting
- Use Web Application Firewall (WAF)
- Regular security audits
- Monitor for suspicious activity
- Implement MFA
- Regular penetration testing

## Smart Contract Issues

### Symptoms
- Contract transactions failing
- Contract not responding
- Incorrect contract behavior
- Contract balance issues

### Initial Assessment
```bash
# Check contract status
soroban contract inspect --id $PAYMENT_CONTRACT_ID --network mainnet

# Check contract balance
soroban account balance --id $PAYMENT_CONTRACT_ID --network mainnet

# Check recent contract transactions
soroban contract history --id $PAYMENT_CONTRACT_ID --network mainnet
```

### Troubleshooting Steps

#### 1. Check Contract State
```bash
# Get contract state
soroban contract invoke \
  --id $PAYMENT_CONTRACT_ID \
  --source admin \
  --network mainnet \
  get_state

# Check contract admin
soroban contract invoke \
  --id $PAYMENT_CONTRACT_ID \
  --source admin \
  --network mainnet \
  get_admin
```

#### 2. Check Contract Logs
```bash
# Check Stellar transaction logs
soroban transaction logs --tx <transaction_id> --network mainnet

# Check Horizon API logs
curl -s "https://horizon.stellar.org/transactions/<transaction_id>"
```

### Resolution Steps

#### Scenario 1: Contract Paused
```bash
# Unpause contract
soroban contract invoke \
  --id $PAYMENT_CONTRACT_ID \
  --source admin \
  --network mainnet \
  unpause

# Verify
soroban contract inspect --id $PAYMENT_CONTRACT_ID --network mainnet
```

#### Scenario 2: Contract Bug
```bash
# Identify the bug
# Review contract code
# Test on testnet

# Deploy fixed contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_contract_v2.wasm \
  --source admin \
  --network mainnet

# Migrate state if needed
# Update environment variables
# Update application to use new contract
```

#### Scenario 3: Insufficient Contract Balance
```bash
# Check contract balance
soroban account balance --id $PAYMENT_CONTRACT_ID --network mainnet

# Fund contract
soroban account fund --id $PAYMENT_CONTRACT_ID --network mainnet

# Verify
soroban account balance --id $PAYMENT_CONTRACT_ID --network mainnet
```

### Prevention
- Thorough testing before deployment
- Use testnet first
- Implement contract upgrade mechanism
- Regular contract audits
- Monitor contract activity
- Maintain adequate contract balance

## Webhook Delivery Failures

### Symptoms
- Webhooks not being delivered
- High webhook failure rate
- Webhook timeout errors
- Webhook signature verification failures

### Initial Assessment
```bash
# Check webhook delivery status
curl -s http://localhost:3000/metrics | grep webhook_delivery

# Check webhook logs
grep -i webhook /var/log/paya/error.log | tail -50

# Check webhook queue
redis-cli LLEN webhook-delivery
```

### Troubleshooting Steps

#### 1. Check Webhook Configuration
```bash
# Check registered webhooks
psql -U postgres -d paya -c "SELECT * FROM webhooks WHERE status = 'ACTIVE';"

# Check webhook URLs
psql -U postgres -d paya -c "SELECT url, status FROM webhooks;"
```

#### 2. Check Delivery Logs
```bash
# Check webhook delivery logs
psql -U postgres -d paya -c "
  SELECT * FROM webhook_deliveries 
  WHERE status = 'FAILED' 
  ORDER BY created_at DESC 
  LIMIT 20;
"

# Check error messages
psql -U postgres -d paya -c "
  SELECT error_message, COUNT(*) 
  FROM webhook_deliveries 
  WHERE status = 'FAILED' 
  GROUP BY error_message;
"
```

### Resolution Steps

#### Scenario 1: Webhook Endpoint Down
```bash
# Check webhook status
psql -U postgres -d paya -c "
  SELECT url, failure_count 
  FROM webhooks 
  WHERE failure_count > 5;
"

# Disable failing webhooks
psql -U postgres -d paya -c "
  UPDATE webhooks 
  SET status = 'DISABLED' 
  WHERE webhook_id = '<webhook_id>';
"

# Notify webhook owner
# Send email about webhook failure
```

#### Scenario 2: Signature Verification Failed
```bash
# Check webhook secret
psql -U postgres -d paya -c "SELECT secret FROM webhooks WHERE webhook_id = '<webhook_id>';"

# Regenerate secret
curl -X POST https://api.paya.io/api/v1/notifications/webhooks/<webhook_id>/regenerate-secret

# Update webhook owner with new secret
```

#### Scenario 3: Webhook Timeout
```bash
# Check response times
psql -U postgres -d paya -c "
  SELECT AVG(response_time) 
  FROM webhook_deliveries 
  WHERE webhook_id = '<webhook_id>';
"

# Increase timeout if needed
# Update webhook service configuration

# Implement retry logic with exponential backoff
```

#### Scenario 4: Queue Backlog
```bash
# Check queue length
redis-cli LLEN webhook-delivery

# Scale webhook workers
pm2 scale webhook-worker 5

# Or increase worker concurrency
```

### Prevention
- Monitor webhook delivery rates
- Implement retry logic
- Set up webhook health checks
- Notify on webhook failures
- Implement circuit breakers
- Regular webhook URL validation

## Support

For runbook issues, contact:
- **DevOps Team**: devops@paya.io
- **On-Call**: +1-555-0123 (24/7)
- **Slack**: #paya-ops
