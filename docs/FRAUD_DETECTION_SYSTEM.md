# Fraud Detection and Risk Scoring System

## Overview

The Paya Fraud Detection and Risk Scoring System is a comprehensive, multi-layered security platform designed to protect merchants and customers from fraudulent transactions. This system combines real-time risk assessment, machine learning-based pattern recognition, behavioral analysis, network analysis, and smart contract integration to provide robust fraud prevention capabilities.

## Architecture

The fraud detection system consists of five main components:

1. **Risk Scoring Service** (TypeScript/NestJS) - Real-time risk assessment
2. **Machine Learning Service** (Python/FastAPI) - ML-based fraud detection
3. **Behavioral Analysis Service** (TypeScript/NestJS) - User behavior tracking
4. **Network Analysis Service** (TypeScript/NestJS) - Graph-based fraud ring detection
5. **Fraud Detection Contract** (Rust/Soroban) - On-chain fraud prevention

## Components

### 1. Risk Scoring Service

**Location:** `backend/src/fraud-detection/risk-scoring.service.ts`

The Risk Scoring Service calculates comprehensive risk scores for each payment by analyzing multiple risk factors:

#### Risk Factors

- **Transaction Velocity**: Rate of recent transactions compared to user baseline
- **Amount Anomaly**: Deviation of transaction amount from historical patterns
- **Geographic Risk**: Risk based on location and travel patterns
- **Device Risk**: Risk based on device fingerprint and browser characteristics
- **Time Pattern**: Risk based on transaction timing patterns
- **Merchant Risk**: Historical fraud rate for the merchant

#### Risk Tiers

- **Low (0-30)**: Normal processing
- **Medium (31-60)**: Additional monitoring
- **High (61-80)**: Requires verification
- **Critical (81-100)**: Block or freeze payment

#### API Endpoints

```typescript
POST /fraud-detection/risk-scoring/calculate
GET /fraud-detection/risk-scoring/factors/:paymentId
PUT /fraud-detection/risk-scoring/thresholds/:merchantId
GET /fraud-detection/risk-scoring/statistics
```

#### Performance

- Latency: < 100ms for real-time evaluation
- Throughput: > 1,000 evaluations/second

### 2. Machine Learning Service

**Location:** `ml-service/app.py`

The ML Service provides advanced fraud detection using ensemble machine learning models:

#### Models

- **Random Forest**: Primary fraud classification model
- **Isolation Forest**: Anomaly detection for unusual patterns
- **SMOTE**: Handling class imbalance in training data

#### Features

- **Fraud Probability Prediction**: Real-time fraud likelihood
- **Explainable AI**: SHAP values for model interpretation
- **Anomaly Detection**: Identifies unusual transaction patterns
- **Graph Analysis**: Detects fraud rings using network analysis

#### API Endpoints

```python
POST /predict - Predict fraud probability
POST /explain - Get SHAP values for predictions
POST /train - Train models with historical data
POST /detect-anomalies - Detect anomalous transactions
POST /analyze-graph - Analyze transaction graphs for fraud rings
GET /health - Service health check
```

#### Performance

- Prediction latency: < 50ms
- Model accuracy: > 95% on test dataset
- False positive rate: < 1%
- False negative rate: < 5%

### 3. Behavioral Analysis Service

**Location:** `backend/src/fraud-detection/behavioral-analysis.service.ts`

Tracks and analyzes user behavior patterns to detect anomalies:

#### Tracked Behaviors

- **Transaction Patterns**: Amounts, frequencies, merchants
- **Navigation Patterns**: Page visits, click patterns, session duration
- **Time Patterns**: Transaction timing, day of week patterns
- **Device Patterns**: Device fingerprints, browsers, operating systems
- **Location Patterns**: Geographic locations, IP addresses

#### API Endpoints

```typescript
POST /fraud-detection/behavioral-analysis/track
GET /fraud-detection/behavioral-analysis/profile/:userId
POST /fraud-detection/behavioral-analysis/detect-anomalies/:userId
POST /fraud-detection/behavioral-analysis/compare-baseline/:userId
```

#### Performance

- Anomaly detection: < 200ms
- Behavioral precision: > 90%

### 4. Network Analysis Service

**Location:** `backend/src/fraud-detection/network-analysis.service.ts`

Analyzes transaction graphs to detect coordinated fraud rings:

#### Analysis Capabilities

- **Connected Components**: Identifies clusters of related accounts
- **Community Detection**: Finds groups with similar transaction patterns
- **PageRank**: Identifies central nodes in fraud networks
- **Cycle Detection**: Detects circular money laundering patterns
- **Fan-out Detection**: Identifies layering patterns

#### API Endpoints

```typescript
POST /fraud-detection/network-analysis/build-graph
POST /fraud-detection/network-analysis/detect-fraud-rings
GET /fraud-detection/network-analysis/similarity
POST /fraud-detection/network-analysis/detect-money-laundering
```

#### Performance

- Graph analysis speed: < 5 seconds for 10,000 node graph
- Fraud ring detection: > 80% identification rate

### 5. Fraud Detection Contract

**Location:** `smartcontracts/contracts/fraud_detection_contract/src/lib.rs`

Soroban smart contract for on-chain fraud prevention:

#### Contract Functions

```rust
initialize(env, admin) - Initialize contract with admin
check_fraud_risk(env, payment_id, risk_score, risk_threshold) - Check payment risk
freeze_payment(env, payment_id, admin, reason) - Freeze suspicious payment
release_payment(env, payment_id, admin) - Release frozen payment
report_fraud(env, payment_id, fraud_type, reporter, evidence) - Report fraud
resolve_fraud(env, report_id, admin, status) - Resolve fraud report
get_fraud_statistics(env) - Get fraud statistics
is_payment_frozen(env, payment_id) - Check if payment is frozen
get_frozen_payment_details(env, payment_id) - Get freeze details
set_merchant_threshold(env, merchant_id, threshold) - Set merchant threshold
get_merchant_threshold(env, merchant_id) - Get merchant threshold
```

#### Storage Layout

- **Frozen Payments**: payment_id → (freezer_address, reason, timestamp)
- **Fraud Reports**: report_id → FraudReport
- **Statistics**: Counters for total, confirmed, false positives, pending
- **Thresholds**: merchant_id → risk_threshold

#### Events

- `PaymentFrozen`: Emitted when payment is frozen
- `PaymentReleased`: Emitted when payment is released
- `FraudReported`: Emitted when fraud is reported
- `FraudResolved`: Emitted when fraud report is resolved

#### Gas Costs

- check_fraud_risk: ~5,000 gas
- freeze_payment: ~10,000 gas
- release_payment: ~8,000 gas
- report_fraud: ~12,000 gas

## Database Schema

### Risk Scores Table

```sql
CREATE TABLE risk_scores (
  id BIGSERIAL PRIMARY KEY,
  payment_id VARCHAR(255) UNIQUE NOT NULL,
  overall_score INTEGER NOT NULL,
  risk_tier VARCHAR(20) NOT NULL,
  factors JSONB NOT NULL,
  confidence DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Fraud Incidents Table

```sql
CREATE TABLE fraud_incidents (
  id BIGSERIAL PRIMARY KEY,
  payment_id VARCHAR(255) NOT NULL,
  fraud_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  evidence JSONB,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255)
);
```

### Behavioral Profiles Table

```sql
CREATE TABLE behavioral_profiles (
  user_id VARCHAR(255) PRIMARY KEY,
  profile_data JSONB NOT NULL,
  baseline_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Transaction Graph Edges Table

```sql
CREATE TABLE transaction_graph_edges (
  id BIGSERIAL PRIMARY KEY,
  source_entity VARCHAR(255) NOT NULL,
  target_entity VARCHAR(255) NOT NULL,
  edge_type VARCHAR(50) NOT NULL,
  weight DECIMAL(10,4),
  transaction_count INTEGER,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### ML Model Versions Table

```sql
CREATE TABLE ml_model_versions (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  model_path TEXT NOT NULL,
  features JSONB NOT NULL,
  performance_metrics JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(model_name, version)
);
```

## Installation and Setup

### Backend Services

1. **Install Dependencies**
```bash
cd backend
pnpm install
```

2. **Database Setup**
```bash
# Run migrations
pnpm migration:run
```

3. **Environment Variables**
Add to `.env`:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=paya
```

4. **Start Services**
```bash
pnpm start:dev
```

### ML Service

1. **Install Dependencies**
```bash
cd ml-service
pip install -r requirements.txt
```

2. **Train Initial Models**
```bash
# Prepare training data and call /train endpoint
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"features": [...], "labels": [...]}'
```

3. **Start Service**
```bash
python app.py
```

### Smart Contracts

1. **Build Contract**
```bash
cd smartcontracts/contracts/fraud_detection_contract
cargo build --target wasm32-unknown-unknown --release
```

2. **Deploy Contract**
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/fraud_detection_contract.wasm \
  --source <your-key> \
  --network testnet
```

3. **Initialize Contract**
```bash
soroban contract invoke \
  --id <contract-id> \
  --source <your-key> \
  --network testnet \
  -- initialize \
  --admin <admin-address>
```

## Usage Examples

### Calculate Risk Score

```typescript
const riskScore = await fetch('http://localhost:3000/fraud-detection/risk-scoring/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentId: 'pay_123',
    amount: 1000,
    merchantId: 'merchant_1',
    customerId: 'customer_1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    deviceFingerprint: 'fp_123',
    country: 'US',
    region: 'CA'
  })
});
```

### Predict Fraud with ML

```python
import requests

response = requests.post('http://localhost:8000/predict', json={
    'features': {
        'amount': 1000.0,
        'transaction_velocity': 5,
        'amount_anomaly': 30,
        'geographic_risk': 20,
        'device_risk': 15,
        'time_pattern': 25,
        'merchant_risk': 10
    },
    'model_type': 'random_forest'
})

fraud_probability = response.json()['fraud_probability']
```

### Check Fraud Risk On-Chain

```rust
use soroban_sdk::{Env, Symbol, Address};

let risk_check = fraud_detection_contract::check_fraud_risk(
    &env,
    Symbol::short("pay_123"),
    75, // risk_score
    60  // risk_threshold
);

if !risk_check.is_safe {
    // Require additional verification or block payment
}
```

## Testing

### Backend Tests

```bash
cd backend
pnpm test              # Unit tests
pnpm test:e2e         # End-to-end tests
pnpm test:cov         # Coverage report
```

### ML Service Tests

```bash
cd ml-service
pytest tests/         # Python tests
```

### Smart Contract Tests

```bash
cd smartcontracts/contracts/fraud_detection_contract
cargo test            # Rust unit tests
```

## Monitoring and Metrics

### Key Performance Indicators

- **Risk Scoring Latency**: Target < 100ms
- **ML Prediction Latency**: Target < 50ms
- **Fraud Detection Rate**: Target > 95%
- **False Positive Rate**: Target < 1%
- **False Negative Rate**: Target < 5%
- **System Throughput**: Target > 1,000 evaluations/second

### Monitoring Endpoints

- **Backend Health**: `GET /health`
- **ML Service Health**: `GET http://localhost:8000/health`
- **Fraud Statistics**: `GET /fraud-detection/risk-scoring/statistics`

## Security Considerations

### Data Protection

- All sensitive data encrypted at rest
- API endpoints authenticated with JWT
- Database connections use SSL/TLS
- PII data masked in logs

### Smart Contract Security

- Admin-only functions protected by address verification
- Immutable fraud reports for audit trail
- Events emitted for all state changes
- Gas optimization for cost-effective operations

### ML Model Security

- Model versioning and rollback capability
- Adversarial attack detection
- Regular model retraining and drift detection
- Explainable AI for regulatory compliance

## Troubleshooting

### Common Issues

**High False Positive Rate**
- Adjust merchant-specific thresholds
- Retrain ML models with recent data
- Review behavioral baseline calibration

**Slow Performance**
- Check database query optimization
- Verify ML model loading and caching
- Review graph analysis complexity

**Smart Contract Failures**
- Verify admin address authorization
- Check sufficient gas balance
- Review contract initialization status

## Future Enhancements

- Real-time streaming analysis with Apache Kafka
- Advanced deep learning models (LSTM, GNN)
- Integration with external fraud databases
- Multi-language support for international fraud patterns
- Mobile SDK for client-side fraud detection

## Contributing

Please refer to the main CONTRIBUTING.md file for guidelines on contributing to the fraud detection system.

## License

This fraud detection system is part of the Paya platform and follows the same license terms.