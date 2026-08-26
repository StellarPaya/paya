from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import shap
from datetime import datetime
import networkx as nx
from imblearn.over_sampling import SMOTE

app = FastAPI(title="Paya Fraud Detection ML Service")

# Global variables for models
models = {
    'isolation_forest': None,
    'random_forest': None,
    'scaler': None
}

class PredictionRequest(BaseModel):
    features: Dict[str, float]
    model_type: str = 'random_forest'

class PredictionResponse(BaseModel):
    fraud_probability: float
    prediction: int
    confidence: float
    model_used: str

class ExplanationResponse(BaseModel):
    prediction: float
    shap_values: Dict[str, float]
    feature_importance: Dict[str, float]

class TrainingData(BaseModel):
    features: List[Dict[str, float]]
    labels: List[int]

class ModelMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: List[List[int]]

class AnomalyDetectionRequest(BaseModel):
    transactions: List[Dict[str, float]]

class AnomalyDetectionResponse(BaseModel):
    anomalies: List[Dict[str, any]]
    anomaly_count: int
    anomaly_score: float

class GraphAnalysisRequest(BaseModel):
    nodes: List[str]
    edges: List[Dict[str, str]]

class GraphAnalysisResponse(BaseModel):
    fraud_rings: List[Dict[str, any]]
    central_nodes: List[Dict[str, str]]
    suspicious_communities: List[List[str]]

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    print("Loading ML models...")
    try:
        models['scaler'] = joblib.load('models/scaler.pkl')
        models['isolation_forest'] = joblib.load('models/isolation_forest.pkl')
        models['random_forest'] = joblib.load('models/random_forest.pkl')
        print("Models loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load models: {e}")
        print("Models will be trained on first training request")

@app.post("/predict", response_model=PredictionResponse)
async def predict_fraud_probability(request: PredictionRequest):
    """Predict fraud probability using ensemble models"""
    try:
        if models['random_forest'] is None:
            raise HTTPException(status_code=503, detail="Model not trained yet")
        
        # Convert features to DataFrame
        feature_df = pd.DataFrame([request.features])
        
        # Scale features
        if models['scaler']:
            scaled_features = models['scaler'].transform(feature_df)
        else:
            scaled_features = feature_df.values
        
        # Make prediction
        model = models['random_forest']
        fraud_probability = model.predict_proba(scaled_features)[0][1]
        prediction = int(fraud_probability > 0.5)
        confidence = max(fraud_probability, 1 - fraud_probability)
        
        return PredictionResponse(
            fraud_probability=float(fraud_probability),
            prediction=prediction,
            confidence=float(confidence),
            model_used='random_forest'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain", response_model=ExplanationResponse)
async def explain_prediction(request: PredictionRequest):
    """Explain prediction using SHAP values"""
    try:
        if models['random_forest'] is None:
            raise HTTPException(status_code=503, detail="Model not trained yet")
        
        feature_df = pd.DataFrame([request.features])
        
        if models['scaler']:
            scaled_features = models['scaler'].transform(feature_df)
        else:
            scaled_features = feature_df.values
        
        model = models['random_forest']
        fraud_probability = model.predict_proba(scaled_features)[0][1]
        
        # Calculate SHAP values
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(scaled_features)
        
        # Get feature importance
        feature_importance = dict(zip(
            feature_df.columns,
            model.feature_importances_
        ))
        
        # Format SHAP values
        shap_dict = dict(zip(
            feature_df.columns,
            shap_values[0][0] if isinstance(shap_values, list) else shap_values[0]
        ))
        
        return ExplanationResponse(
            prediction=float(fraud_probability),
            shap_values=shap_dict,
            feature_importance=feature_importance
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train", response_model=ModelMetrics)
async def train_models(data: TrainingData):
    """Train and evaluate fraud detection models"""
    try:
        # Convert to DataFrame
        X = pd.DataFrame(data.features)
        y = np.array(data.labels)
        
        # Handle class imbalance with SMOTE
        smote = SMOTE(random_state=42)
        X_resampled, y_resampled = smote.fit_resample(X, y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_resampled, y_resampled, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Random Forest
        rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        rf_model.fit(X_train_scaled, y_train)
        
        # Train Isolation Forest for anomaly detection
        iso_forest = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        iso_forest.fit(X_train_scaled)
        
        # Evaluate Random Forest
        y_pred = rf_model.predict(X_test_scaled)
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Calculate confusion matrix
        from sklearn.metrics import confusion_matrix
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        # Save models
        import os
        os.makedirs('models', exist_ok=True)
        joblib.dump(scaler, 'models/scaler.pkl')
        joblib.dump(rf_model, 'models/random_forest.pkl')
        joblib.dump(iso_forest, 'models/isolation_forest.pkl')
        
        # Update global models
        models['scaler'] = scaler
        models['random_forest'] = rf_model
        models['isolation_forest'] = iso_forest
        
        return ModelMetrics(
            accuracy=float(accuracy),
            precision=float(precision),
            recall=float(recall),
            f1_score=float(f1),
            confusion_matrix=cm
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-anomalies", response_model=AnomalyDetectionResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """Detect anomalous transactions using Isolation Forest"""
    try:
        if models['isolation_forest'] is None:
            raise HTTPException(status_code=503, detail="Model not trained yet")
        
        # Convert to DataFrame
        df = pd.DataFrame(request.transactions)
        
        # Scale features
        if models['scaler']:
            scaled_features = models['scaler'].transform(df)
        else:
            scaled_features = df.values
        
        # Detect anomalies
        iso_forest = models['isolation_forest']
        anomaly_scores = iso_forest.decision_function(scaled_features)
        predictions = iso_forest.predict(scaled_features)
        
        # Collect anomalies
        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
            if pred == -1:  # Anomaly
                anomalies.append({
                    'index': i,
                    'transaction': request.transactions[i],
                    'anomaly_score': float(score),
                    'severity': 'high' if score < -0.5 else 'medium'
                })
        
        # Calculate overall anomaly score
        anomaly_count = len(anomalies)
        anomaly_score = anomaly_count / len(request.transactions) if request.transactions else 0
        
        return AnomalyDetectionResponse(
            anomalies=anomalies,
            anomaly_count=anomaly_count,
            anomaly_score=float(anomaly_score)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-graph", response_model=GraphAnalysisResponse)
async def analyze_graph(request: GraphAnalysisRequest):
    """Detect fraud rings using graph analysis"""
    try:
        # Build NetworkX graph
        G = nx.Graph()
        G.add_nodes_from(request.nodes)
        
        for edge in request.edges:
            G.add_edge(edge['source'], edge['target'])
        
        # Detect communities using Louvain method
        try:
            import community as community_louvain
            communities = community_louvain.best_partition(G)
        except ImportError:
            # Fallback to connected components
            communities = {}
            for i, component in enumerate(nx.connected_components(G)):
                for node in component:
                    communities[node] = i
        
        # Group nodes by community
        community_groups = {}
        for node, comm_id in communities.items():
            if comm_id not in community_groups:
                community_groups[comm_id] = []
            community_groups[comm_id].append(node)
        
        # Identify suspicious communities (large communities)
        suspicious_communities = [
            community_groups[comm_id] 
            for comm_id in community_groups 
            if len(community_groups[comm_id]) >= 3
        ]
        
        # Calculate PageRank to find central nodes
        pagerank = nx.pagerank(G)
        central_nodes = [
            {'node': node, 'pagerank': score}
            for node, score in sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # Detect potential fraud rings (connected components with high density)
        fraud_rings = []
        for component in nx.connected_components(G):
            if len(component) >= 3:
                subgraph = G.subgraph(component)
                density = nx.density(subgraph)
                
                if density > 0.5:  # High density suggests potential fraud ring
                    fraud_rings.append({
                        'members': list(component),
                        'size': len(component),
                        'density': density,
                        'central_node': max(pagerank.items(), key=lambda x: x[1] if x[0] in component else 0)[0]
                    })
        
        return GraphAnalysisResponse(
            fraud_rings=fraud_rings,
            central_nodes=central_nodes,
            suspicious_communities=suspicious_communities
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": {
            "isolation_forest": models['isolation_forest'] is not None,
            "random_forest": models['random_forest'] is not None,
            "scaler": models['scaler'] is not None
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)