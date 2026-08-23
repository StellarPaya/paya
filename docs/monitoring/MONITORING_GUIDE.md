# Paya Platform Monitoring Guide

## Table of Contents
1. [Metrics Collection](#metrics-collection)
2. [Logging](#logging)
3. [Alerting](#alerting)
4. [Dashboards](#dashboards)
5. [Performance Monitoring](#performance-monitoring)
6. [Uptime Monitoring](#uptime-monitoring)

## Metrics Collection

### Application Metrics

#### Key Metrics to Collect

**Business Metrics:**
- Total payments processed
- Payment success rate
- Payment failure rate
- Average payment amount
- Total subscription revenue (MRR/ARR)
- Active subscriptions count
- Churn rate
- Transaction volume

**Technical Metrics:**
- Request rate (RPS)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database query time
- Cache hit rate
- Queue length
- Worker utilization

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk usage
- Network I/O
- Disk I/O
- Open file descriptors

#### Implement Metrics in Backend

```typescript
// metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly paymentCounter: Counter;
  private readonly paymentSuccessCounter: Counter;
  private readonly paymentFailureCounter: Counter;
  private readonly requestDuration: Histogram;
  private readonly activeSubscriptions: Gauge;

  constructor() {
    this.paymentCounter = new Counter({
      name: 'paya_payments_total',
      help: 'Total number of payments processed',
      labelNames: ['status', 'currency'],
    });

    this.paymentSuccessCounter = new Counter({
      name: 'paya_payments_success_total',
      help: 'Total number of successful payments',
      labelNames: ['currency'],
    });

    this.paymentFailureCounter = new Counter({
      name: 'paya_payments_failure_total',
      help: 'Total number of failed payments',
      labelNames: ['reason'],
    });

    this.requestDuration = new Histogram({
      name: 'paya_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.activeSubscriptions = new Gauge({
      name: 'paya_subscriptions_active',
      help: 'Number of active subscriptions',
    });
  }

  incrementPayment(status: string, currency: string): void {
    this.paymentCounter.inc({ status, currency });
  }

  incrementPaymentSuccess(currency: string): void {
    this.paymentSuccessCounter.inc({ currency });
  }

  incrementPaymentFailure(reason: string): void {
    this.paymentFailureCounter.inc({ reason });
  }

  recordRequestDuration(method: string, route: string, status: number, duration: number): void {
    this.requestDuration.observe({ method, route, status }, duration);
  }

  setActiveSubscriptions(count: number): void {
    this.activeSubscriptions.set(count);
  }
}
```

#### Metrics Endpoint

```typescript
// metrics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics(): string {
    return register.metrics();
  }
}
```

### Database Metrics

#### PostgreSQL Exporter

```bash
# Install PostgreSQL exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.11.1/postgres_exporter-0.11.1.linux-amd64.tar.gz
tar xvfz postgres_exporter-0.11.1.linux-amd64.tar.gz
sudo mv postgres_exporter-0.11.1.linux-amd64/postgres_exporter /usr/local/bin/

# Create systemd service
sudo vim /etc/systemd/system/postgres_exporter.service
```

Content:
```ini
[Unit]
Description=PostgreSQL Exporter
After=network.target postgresql.service

[Service]
Type=simple
User=prometheus
Environment="DATA_SOURCE_NAME=postgresql://postgres:password@localhost:5432/paya?sslmode=disable"
ExecStart=/usr/local/bin/postgres_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl start postgres_exporter
sudo systemctl enable postgres_exporter
```

#### Key Database Metrics

- Connection pool usage
- Query duration
- Slow queries
- Transaction count
- Lock wait time
- Cache hit ratio
- Table size
- Index usage

### Redis Metrics

#### Redis Exporter

```bash
# Install Redis exporter
wget https://github.com/oliver006/redis_exporter/releases/download/v1.53.0/redis_exporter-v1.53.0.linux-amd64.tar.gz
tar xvfz redis_exporter-v1.53.0.linux-amd64.tar.gz
sudo mv redis_exporter-v1.53.0.linux-amd64/redis_exporter /usr/local/bin/

# Create systemd service
sudo vim /etc/systemd/system/redis_exporter.service
```

Content:
```ini
[Unit]
Description=Redis Exporter
After=network.target redis.service

[Service]
Type=simple
User=prometheus
Environment="REDIS_ADDR=localhost:6379"
ExecStart=/usr/local/bin/redis_exporter

[Install]
WantedBy=multi-user.target
```

#### Key Redis Metrics

- Memory usage
- Connected clients
- Commands per second
- Hit rate
- Expired keys
- Evicted keys
- Blocked clients
- Pub/Sub channels

### Stellar Network Metrics

#### Custom Stellar Metrics

```typescript
// stellar-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Server } from 'stellar-sdk';
import { Gauge, Counter } from 'prom-client';

@Injectable()
export class StellarMetricsService {
  private readonly horizonLatency: Gauge;
  private readonly sorobanLatency: Gauge;
  private readonly stellarTransactions: Counter;

  constructor() {
    this.horizonLatency = new Gauge({
      name: 'paya_stellar_horizon_latency_seconds',
      help: 'Horizon API latency in seconds',
    });

    this.sorobanLatency = new Gauge({
      name: 'paya_stellar_soroban_latency_seconds',
      help: 'Soroban RPC latency in seconds',
    });

    this.stellarTransactions = new Counter({
      name: 'paya_stellar_transactions_total',
      help: 'Total Stellar transactions',
      labelNames: ['network', 'status'],
    });
  }

  async collectMetrics(): Promise<void> {
    // Measure Horizon latency
    const horizonStart = Date.now();
    try {
      const server = new Server(process.env.STELLAR_HORIZON_URL);
      await server.loadAccount('GABC...');
      this.horizonLatency.set((Date.now() - horizonStart) / 1000);
    } catch (error) {
      this.horizonLatency.set(-1); // Indicate error
    }

    // Measure Soroban latency
    const sorobanStart = Date.now();
    try {
      // Add Soroban RPC call
      this.sorobanLatency.set((Date.now() - sorobanStart) / 1000);
    } catch (error) {
      this.sorobanLatency.set(-1);
    }
  }
}
```

## Logging

### Log Format

#### Structured Logging

```typescript
// logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: '/var/log/paya/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: '/var/log/paya/combined.log',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info({ message, context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ message, trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn({ message, context });
  }

  debug(message: string, context?: string) {
    this.logger.debug({ message, context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose({ message, context });
  }
}
```

#### Log Schema

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Payment processed successfully",
  "context": "PaymentService",
  "userId": "user_123",
  "paymentId": "pay_456",
  "amount": 100.50,
  "currency": "USD",
  "duration": 1250,
  "traceId": "abc-123-def-456"
}
```

### Log Levels

- **ERROR**: Errors that require immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: Informational messages about normal operations
- **DEBUG**: Detailed debugging information
- **VERBOSE**: Very detailed tracing information

### Log Aggregation

#### ELK Stack Setup

```bash
# Install Elasticsearch
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-7.x.list
sudo apt update
sudo apt install elasticsearch

# Configure Elasticsearch
sudo vim /etc/elasticsearch/elasticsearch.yml
```

```yaml
cluster.name: paya-cluster
node.name: node-1
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node
```

```bash
# Start Elasticsearch
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch

# Install Kibana
sudo apt install kibana

# Configure Kibana
sudo vim /etc/kibana/kibana.yml
```

```yaml
server.host: "0.0.0.0"
server.port: 5601
elasticsearch.hosts: ["http://localhost:9200"]
```

```bash
# Start Kibana
sudo systemctl start kibana
sudo systemctl enable kibana

# Install Filebeat
sudo apt install filebeat

# Configure Filebeat
sudo vim /etc/filebeat/filebeat.yml
```

```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/paya/*.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "paya-logs-%{+yyyy.MM.dd}"

setup.kibana:
  host: "localhost:5601"
```

```bash
# Start Filebeat
sudo systemctl start filebeat
sudo systemctl enable filebeat
```

#### Loki Stack Setup

```bash
# Install Loki
wget https://github.com/grafana/loki/releases/download/v2.9.0/loki-linux-amd64.zip
unzip loki-linux-amd64.zip
sudo mv loki-linux-amd64 /usr/local/bin/loki

# Configure Loki
sudo vim /etc/loki/config.yml
```

```yaml
server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /tmp/loki/index
    cache_location: /tmp/loki/cache

  filesystem:
    directories:
      - /tmp/loki/chunks
```

```bash
# Start Loki
sudo systemctl start loki
sudo systemctl enable loki

# Install Promtail
wget https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail

# Configure Promtail
sudo vim /etc/promtail/config.yml
```

```yaml
server:
  http_listen_port: 9080

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: paya-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: paya
          __path__: /var/log/paya/*.log
```

```bash
# Start Promtail
sudo systemctl start promtail
sudo systemctl enable promtail
```

## Alerting

### Alert Rules

#### Critical Alerts

**Service Down:**
```yaml
groups:
  - name: critical
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up{job="paya-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "Service {{ $labels.instance }} has been down for more than 1 minute"
```

**High Error Rate:**
```yaml
      - alert: HighErrorRate
        expr: rate(paya_request_duration_seconds_count{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value }} errors/sec for the last 5 minutes"
```

**Database Connection Pool Exhausted:**
```yaml
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Connection pool usage is {{ $value | humanizePercentage }}"
```

#### Warning Alerts

**High Response Time:**
```yaml
  - name: warning
    interval: 1m
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, paya_request_duration_seconds_bucket) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.instance }}"
          description: "P95 response time is {{ $value }}s"
```

**Low Cache Hit Rate:**
```yaml
      - alert: LowCacheHitRate
        expr: redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses) < 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low Redis cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

**Disk Space Low:**
```yaml
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Available disk space is {{ $value | humanizePercentage }}"
```

#### Info Alerts

**New Deployment:**
```yaml
  - name: info
    interval: 1m
    rules:
      - alert: NewDeployment
        expr: paya_build_info{version!="$previous_version"} > 0
        labels:
          severity: info
        annotations:
          summary: "New deployment detected"
          description: "Version {{ $labels.version }} deployed on {{ $labels.instance }}"
```

### Alert Notification Channels

#### Email Notifications

```yaml
# alertmanager.yml
receivers:
  - name: email-team
    email_configs:
      - to: devops@paya.io
        from: alertmanager@paya.io
        smarthost: smtp.gmail.com:587
        auth_username: alertmanager@paya.io
        auth_password: your_password
```

#### Slack Notifications

```yaml
receivers:
  - name: slack-team
    slack_configs:
      - api_url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
        channel: '#paya-alerts'
        username: 'Alertmanager'
        title: '{{ .Status | toUpper }}: {{ .CommonLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

#### PagerDuty Notifications

```yaml
receivers:
  - name: pagerduty-team
    pagerduty_configs:
      - service_key: YOUR_PAGERDUTY_SERVICE_KEY
        description: '{{ .CommonLabels.alertname }}'
        severity: '{{ .CommonLabels.severity }}'
```

#### SMS Notifications

```yaml
receivers:
  - name: sms-oncall
    twilio_configs:
      - from: '+15550123456'
        to: '+15550987654'
        account_sid: YOUR_TWILIO_ACCOUNT_SID
        auth_token: YOUR_TWILIO_AUTH_TOKEN
        body: 'ALERT: {{ .CommonLabels.alertname }} - {{ .CommonAnnotations.description }}'
```

### Alert Routing

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-team'
      continue: true
    - match:
        severity: warning
      receiver: 'slack-team'
      continue: true
    - match:
        severity: info
      receiver: 'email-team'

receivers:
  - name: default
    slack_configs:
      - api_url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
        channel: '#paya-alerts'
```

## Dashboards

### Grafana Setup

```bash
# Install Grafana
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access Grafana
open http://localhost:3000
# Default credentials: admin/admin
```

### Dashboard Templates

#### Overview Dashboard

```json
{
  "dashboard": {
    "title": "Paya Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(paya_request_duration_seconds_count[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(paya_request_duration_seconds_count{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, paya_request_duration_seconds_bucket)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.50, paya_request_duration_seconds_bucket)",
            "legendFormat": "P50"
          }
        ]
      },
      {
        "title": "Active Subscriptions",
        "type": "stat",
        "targets": [
          {
            "expr": "paya_subscriptions_active"
          }
        ]
      }
    ]
  }
}
```

#### Payment Dashboard

```json
{
  "dashboard": {
    "title": "Payment Metrics",
    "panels": [
      {
        "title": "Payments Processed",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(paya_payments_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Payment Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "paya_payments_success_total / paya_payments_total"
          }
        ]
      },
      {
        "title": "Average Payment Amount",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(paya_payment_amount)",
            "legendFormat": "{{currency}}"
          }
        ]
      }
    ]
  }
}
```

#### Database Dashboard

```json
{
  "dashboard": {
    "title": "Database Metrics",
    "panels": [
      {
        "title": "Connection Pool Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "pg_stat_activity_count / pg_settings_max_connections"
          }
        ]
      },
      {
        "title": "Query Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_statements_total_time_ms[5m])",
            "legendFormat": "{{query}}"
          }
        ]
      },
      {
        "title": "Cache Hit Ratio",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)"
          }
        ]
      }
    ]
  }
}
```

## Performance Monitoring

### APM Setup

#### New Relic

```bash
# Install New Relic agent
curl -Ls https://download.newrelic.com/install/newrelic-cli/install.sh | bash
newrelic install

# Configure New Relic
newrelic install -n newrelic-infra
```

```typescript
// main.ts
import * as newrelic from 'newrelic';

newrelic.agent.start({
  app_name: ['Paya Backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  }
});
```

#### Datadog

```bash
# Install Datadog agent
DD_API_KEY=YOUR_API_KEY bash -c "$(curl -L https://raw.githubusercontent.com/DataDog/datadog-agent/master/cmd/agent/install_script.sh)"

# Configure Datadog
sudo vim /etc/datadog-agent/datadog.yaml
```

```yaml
api_key: YOUR_API_KEY
site: datadoghq.com
logs:
  enabled: true
apm:
  enabled: true
```

```typescript
// main.ts
import { tracer } from 'dd-trace';

tracer.init({
  service: 'paya-backend',
  env: process.env.NODE_ENV,
  logInjection: true,
});
```

### Performance Profiling

#### CPU Profiling

```typescript
// Enable in development
if (process.env.NODE_ENV === 'development') {
  const inspector = require('inspector');
  inspector.open(9229, '0.0.0.0');
  console.log('Profiler running on port 9229');
}
```

#### Memory Profiling

```typescript
// memory-profiler.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MemoryProfilerService {
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  async getHeapSnapshot(): Promise<string> {
    const v8 = require('v8');
    const snapshotStream = v8.getHeapSnapshot();
    return new Promise((resolve) => {
      let data = '';
      snapshotStream.on('data', (chunk) => data += chunk);
      snapshotStream.on('end', () => resolve(data));
    });
  }
}
```

### Performance Budgets

#### Response Time Budgets

- **P50**: < 200ms
- **P95**: < 500ms
- **P99**: < 1s

#### Error Rate Budgets

- **4xx errors**: < 1%
- **5xx errors**: < 0.1%

#### Availability Budgets

- **Monthly uptime**: > 99.9%
- **Quarterly uptime**: > 99.95%

## Uptime Monitoring

### External Monitoring

#### UptimeRobot

1. Create account at https://uptimerobot.com
2. Add monitors:
   - https://api.paya.io/api/v1/health
   - https://paya.io
3. Configure alerts:
   - Email: devops@paya.io
   - Slack: #paya-alerts
   - SMS: on-call phone

#### StatusCake

1. Create account at https://www.statuscake.com
2. Add uptime tests:
   - API endpoint: https://api.paya.io/api/v1/health
   - Website: https://paya.io
3. Configure performance tests
4. Set up public status page

#### Pingdom

1. Create account at https://www.pingdom.com
2. Add monitors for all critical endpoints
3. Configure alert thresholds
4. Set up SMS alerts for critical failures

### Synthetic Monitoring

#### API Tests

```typescript
// synthetic-monitoring.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SyntheticMonitoringService {
  async runHealthChecks(): Promise<void> {
    const endpoints = [
      'https://api.paya.io/api/v1/health',
      'https://api.paya.io/api/v1/payments',
      'https://api.paya.io/api/v1/subscriptions',
    ];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        await axios.get(endpoint, { timeout: 5000 });
        const duration = Date.now() - start;
        console.log(`✓ ${endpoint} - ${duration}ms`);
      } catch (error) {
        console.error(`✗ ${endpoint} - FAILED`);
        // Send alert
      }
    }
  }
}
```

#### Browser Tests

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: {
        baseURL: 'https://paya.io',
      },
    },
  ],
  testMatch: '/tests/synthetic/**/*.spec.ts',
});
```

```typescript
// tests/synthetic/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Paya/);
  await expect(page.locator('nav')).toBeVisible();
});
```

### Status Page

#### Status Page Setup

```bash
# Install status page (using statusfy or similar)
npm install -g @statusfy/cli
statusfy init status-page
cd status-page
npm install
npm run dev
```

#### Status Page Configuration

```yaml
# status.yml
title: Paya Status
logo: /logo.png
theme: light
services:
  - name: API
    description: Backend API
    url: https://api.paya.io/api/v1/health
  - name: Website
    description: Main website
    url: https://paya.io
  - name: Database
    description: PostgreSQL database
    url: tcp://localhost:5432
  - name: Redis
    description: Cache layer
    url: tcp://localhost:6379
```

## Support

For monitoring issues, contact:
- **DevOps Team**: devops@paya.io
- **On-Call**: +1-555-0123 (24/7)
- **Slack**: #paya-ops
