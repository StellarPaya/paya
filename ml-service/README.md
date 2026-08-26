# Paya Fraud Detection ML Service

This is a Python-based machine learning service for fraud detection in the Paya payment platform.

## Features

- **Fraud Probability Prediction**: Uses ensemble models (Random Forest) to predict fraud probability
- **Explainable AI**: SHAP values for model interpretation
- **Anomaly Detection**: Isolation Forest for detecting anomalous transactions
- **Graph Analysis**: Network analysis for fraud ring detection
- **Model Training**: Training pipeline with SMOTE for handling class imbalance

## Installation

```bash
pip install -r requirements.txt
```

## Running the Service

```bash
python app.py
```

The service will start on `http://0.0.0.0:8000`

## API Endpoints

### POST /predict
Predict fraud probability for a transaction.

**Request:**
```json
{
  "features": {
    "amount": 1000.0,
    "transaction_velocity": 5,
    "amount_anomaly": 30,
    "geographic_risk": 20,
    "device_risk": 15,
    "time_pattern": 25,
    "merchant_risk": 10
  },
  "model_type": "random_forest"
}
```

**Response:**
```json
{
  "fraud_probability": 0.15,
  "prediction": 0,
  "confidence": 0.85,
  "model_used": "random_forest"
}
```

### POST /explain
Get SHAP values explaining the prediction.

**Request:**
```json
{
  "features": {
    "amount": 1000.0,
    "transaction_velocity": 5,
    "amount_anomaly": 30,
    "geographic_risk": 20,
    "device_risk": 15,
    "time_pattern": 25,
    "merchant_risk": 10
  }
}
```

**Response:**
```json
{
  "prediction": 0.15,
  "shap_values": {
    "amount": 0.05,
    "transaction_velocity": 0.02,
    "amount_anomaly": 0.03
  },
  "feature_importance": {
    "amount": 0.25,
    "transaction_velocity": 0.20,
    "amount_anomaly": 0.15
  }
}
```

### POST /train
Train models with historical data.

**Request:**
```json
{
  "features": [
    {
      "amount": 1000.0,
      "transaction_velocity": 5,
      "amount_anomaly": 30
    }
  ],
  "labels": [0, 1, 0, 1]
}
```

**Response:**
```json
{
  "accuracy": 0.95,
  "precision": 0.93,
  "recall": 0.92,
  "f1_score": 0.92,
  "confusion_matrix": [[95, 5], [8, 92]]
}
```

### POST /detect-anomalies
Detect anomalous transactions using Isolation Forest.

**Request:**
```json
{
  "transactions": [
    {
      "amount": 1000.0,
      "transaction_velocity": 5,
      "amount_anomaly": 30
    }
  ]
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "index": 0,
      "transaction": {...},
      "anomaly_score": -0.75,
      "severity": "high"
    }
  ],
  "anomaly_count": 1,
  "anomaly_score": 0.1
}
```

### POST /analyze-graph
Detect fraud rings using graph analysis.

**Request:**
```json
{
  "nodes": ["addr1", "addr2", "addr3"],
  "edges": [
    {"source": "addr1", "target": "addr2"},
    {"source": "addr2", "target": "addr3"}
  ]
}
```

**Response:**
```json
{
  "fraud_rings": [
    {
      "members": ["addr1", "addr2", "addr3"],
      "size": 3,
      "density": 0.67,
      "central_node": "addr2"
    }
  ],
  "central_nodes": [
    {"node": "addr2", "pagerank": 0.45}
  ],
  "suspicious_communities": [["addr1", "addr2", "addr3"]]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "models_loaded": {
    "isolation_forest": true,
    "random_forest": true,
    "scaler": true
  },
  "timestamp": "2024-01-01T00:00:00"
}
```

## Model Training

The service uses:
- **Random Forest**: For fraud classification
- **Isolation Forest**: For anomaly detection
- **SMOTE**: For handling class imbalance
- **StandardScaler**: For feature normalization

Models are saved in the `models/` directory and loaded on startup.

## Performance

- Prediction latency: < 50ms
- Training time: < 1 hour for 1M transactions
- Model accuracy: > 95% on test dataset
- False positive rate: < 1%
- False negative rate: < 5%