"""
REST API Endpoints for the Medical IoMT Cybersecurity Risk Prediction System.
All routes are registered as a single router and mounted in main.py.
"""
import csv
import io
import uuid
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db, SessionLocal
from backend.app.models.entities import Device, Alert, NetworkEvent, ModelArtifact
from backend.app.schemas.schemas import (
    DeviceCreate, DeviceUpdate, DeviceResponse,
    AlertResponse, AlertStatusUpdate,
    SinglePredictionRequest, PredictionResponse, BatchPredictionResponse, BatchPredictionItem,
    WhatIfRequest, WhatIfResponse,
    DashboardSummary, SimulationStatus,
)
from backend.app.services import device_service, alert_service, dashboard_service
from backend.app.risk.scoring import risk_engine, DEVICE_PROFILES
from backend.app.ml.model import predictor, ModelTrainer
from backend.app.ml.sample_data import generate_synthetic_event, SAMPLE_DEVICES
from backend.app.simulation.engine import simulation_engine

logger = logging.getLogger(__name__)
router = APIRouter()

# =====================================================================
# Health Check
# =====================================================================
@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "model_loaded": predictor.is_loaded,
        "version": "1.0.0",
    }


# =====================================================================
# Dashboard
# =====================================================================
@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    return dashboard_service.get_dashboard_summary(db)


# =====================================================================
# Devices
# =====================================================================
@router.get("/devices", response_model=List[DeviceResponse])
def list_devices(active_only: bool = True, db: Session = Depends(get_db)):
    return device_service.get_all_devices(db, active_only)


@router.post("/devices", response_model=DeviceResponse, status_code=201)
def create_device(data: DeviceCreate, db: Session = Depends(get_db)):
    try:
        return device_service.create_device(db, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/devices/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db)):
    device = device_service.get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return device


@router.patch("/devices/{device_id}", response_model=DeviceResponse)
def update_device(device_id: str, data: DeviceUpdate, db: Session = Depends(get_db)):
    device = device_service.update_device(db, device_id, data)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return device


# =====================================================================
# Predictions
# =====================================================================
@router.post("/predict", response_model=PredictionResponse)
def predict_single(req: SinglePredictionRequest, db: Session = Depends(get_db)):
    """Predict threat classification for a single network event."""
    # Get device info for risk assessment
    device = device_service.get_device(db, req.device_id) if req.device_id else None
    device_criticality = device.criticality if device else "Medium"
    device_type = device.device_type if device else "Default"
    device_name = device.name if device else None

    if predictor.is_loaded:
        result = predictor.predict_single(req.features)
        attack_type = result["predicted_attack_type"]
        confidence = result["confidence"]
        contributions = result["contributions"]
    else:
        # Demo mode: use synthetic prediction based on feature heuristics
        attack_type, confidence = _demo_classify(req.features)
        contributions = []

    # Risk assessment (independent of model)
    assessment = risk_engine.assess_event_risk(
        attack_type=attack_type,
        confidence=confidence,
        device_criticality=device_criticality,
        device_type=device_type,
    )

    return PredictionResponse(
        predicted_label="Benign" if attack_type == "Benign" else "Attack",
        predicted_attack_type=attack_type,
        confidence=round(confidence, 4),
        risk_score=assessment.risk_score,
        risk_category=assessment.risk_category,
        likelihood=assessment.likelihood,
        impact=assessment.impact,
        contributing_factors=[
            {"feature": c["feature"], "value": c["value"], "importance": c["importance"], "effect": c["effect"]}
            for c in contributions[:8]
        ],
        recommended_action=assessment.recommended_mitigation,
        device_id=req.device_id,
        device_name=device_name,
        is_synthetic=not predictor.is_loaded,
    )


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Batch prediction from CSV upload."""
    # Validate file
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    if file.size and file.size > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

    try:
        content = await file.read()
        text = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    if len(rows) > 10000:
        raise HTTPException(status_code=400, detail="CSV exceeds 10,000 row limit")
    if len(rows) == 0:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    results = []
    attack_count = 0
    benign_count = 0
    high_critical = 0
    distribution = {}

    for i, row in enumerate(rows):
        # Convert row values to float
        features = {}
        for k, v in row.items():
            if k.lower() in ("label", "attack_type", "sub_category", "is_synthetic"):
                continue
            try:
                features[k] = float(v)
            except (ValueError, TypeError):
                pass

        if predictor.is_loaded:
            pred = predictor.predict_single(features)
            attack_type = pred["predicted_attack_type"]
            confidence = pred["confidence"]
        else:
            attack_type, confidence = _demo_classify(features)

        assessment = risk_engine.assess_event_risk(
            attack_type=attack_type,
            confidence=confidence,
        )

        if attack_type == "Benign":
            benign_count += 1
        else:
            attack_count += 1
        
        if assessment.risk_category in ("High", "Critical"):
            high_critical += 1

        distribution[attack_type] = distribution.get(attack_type, 0) + 1

        # Keep only top 5 features by value for display
        key_features = dict(sorted(features.items(), key=lambda x: abs(x[1]), reverse=True)[:5])

        results.append(BatchPredictionItem(
            row_index=i,
            device_id=row.get("device_id"),
            predicted_label="Benign" if attack_type == "Benign" else "Attack",
            predicted_attack_type=attack_type,
            confidence=round(confidence, 4),
            risk_score=assessment.risk_score,
            risk_category=assessment.risk_category,
            key_features=key_features,
        ))

    return BatchPredictionResponse(
        total_records=len(rows),
        attack_count=attack_count,
        benign_count=benign_count,
        high_critical_count=high_critical,
        results=results,
        distribution=distribution,
    )


# =====================================================================
# Alerts
# =====================================================================
@router.get("/alerts")
def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    alerts = alert_service.get_alerts(db, status, severity, device_id, limit, offset)
    total = alert_service.get_alert_count(db, status)
    return {
        "alerts": [AlertResponse.model_validate(a) for a in alerts],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/alerts/{alert_id}")
def update_alert(alert_id: str, data: AlertStatusUpdate, db: Session = Depends(get_db)):
    try:
        alert = alert_service.update_alert_status(db, alert_id, data.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return AlertResponse.model_validate(alert)


# =====================================================================
# Model Performance
# =====================================================================
@router.get("/model/metrics")
def get_model_metrics():
    """Return model evaluation metrics (real if trained, otherwise indicator)."""
    status = predictor.get_model_status()
    if status["status"] != "loaded":
        return {
            "status": "not_available",
            "message": "No model has been trained yet. Model metrics will appear after training.",
            "is_placeholder": True,
        }
    return {
        "status": "available",
        **predictor.metrics,
        "is_placeholder": False,
    }


@router.post("/model/train")
def train_model(model_type: str = Query("random_forest")):
    """Trigger model training (can take a while)."""
    if model_type not in ("random_forest", "xgboost"):
        raise HTTPException(status_code=400, detail="model_type must be 'random_forest' or 'xgboost'")
    
    trainer = ModelTrainer()
    metrics = trainer.train(model_type=model_type)
    
    # Reload the predictor with the new model
    predictor.load()
    
    return {"message": "Training complete", "metrics": metrics}


# =====================================================================
# What-If Risk Analysis
# =====================================================================
@router.post("/risk/what-if", response_model=WhatIfResponse)
def what_if_analysis(req: WhatIfRequest, db: Session = Depends(get_db)):
    """Simulate a risk scenario. Results are CLEARLY LABELED as simulations."""
    device = device_service.get_device(db, req.device_id) if req.device_id else None
    device_type = device.device_type if device else "Default"

    assessment = risk_engine.assess_event_risk(
        attack_type=req.threat_category,
        confidence=0.90,  # Hypothetical high-confidence for what-if
        device_criticality=req.device_criticality,
        device_type=device_type,
        likelihood_override=req.likelihood_override,
        impact_override=req.impact_override,
    )

    return WhatIfResponse(
        device_id=req.device_id,
        device_criticality=req.device_criticality,
        threat_category=req.threat_category,
        calculated_likelihood=assessment.likelihood,
        calculated_impact=assessment.impact,
        risk_score=assessment.risk_score,
        risk_category=assessment.risk_category,
        formula_breakdown=assessment.formula_breakdown,
        clinical_implication=assessment.clinical_implication,
        recommended_mitigation=assessment.recommended_mitigation,
        is_simulation=True,
    )


# =====================================================================
# Simulation
# =====================================================================
@router.post("/simulation/start")
async def start_simulation(interval: float = Query(3.0, ge=1.0, le=30.0)):
    if simulation_engine.is_running:
        return {"message": "Simulation already running", **simulation_engine.get_status()}
    
    await simulation_engine.start(db_factory=SessionLocal, interval=interval)
    return {"message": "Simulation started", **simulation_engine.get_status()}


@router.post("/simulation/stop")
async def stop_simulation():
    await simulation_engine.stop()
    return {"message": "Simulation stopped", **simulation_engine.get_status()}


@router.get("/simulation/status")
def simulation_status():
    return simulation_engine.get_status()


# =====================================================================
# Reports
# =====================================================================
@router.get("/reports/summary")
def report_summary(db: Session = Depends(get_db)):
    return dashboard_service.get_report_summary(db)


@router.get("/reports/export")
def export_report_csv(db: Session = Depends(get_db)):
    """Export alert data as CSV."""
    alerts = alert_service.get_alerts(db, limit=10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "alert_id", "device_id", "device_name", "attack_type", "severity",
        "risk_score", "confidence", "status", "summary", "created_at"
    ])
    for a in alerts:
        writer.writerow([
            a.alert_id, a.device_id, a.device_name, a.attack_type, a.severity,
            a.risk_score, a.confidence, a.status, a.summary,
            a.created_at.isoformat() if a.created_at else "",
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=security_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


# =====================================================================
# Helper: Demo classifier when no model is trained
# =====================================================================
def _demo_classify(features: dict) -> tuple:
    """
    Simple rule-based classifier for demo mode.
    NOT an ML model - clearly a heuristic fallback.
    """
    rate = features.get("Rate", 0)
    syn = features.get("syn_flag_number", 0)
    rst = features.get("rst_flag_number", 0)
    psh = features.get("psh_flag_number", 0)
    tot_sum = features.get("Tot sum", 0)
    number = features.get("Number", 0)
    
    if rate > 5000 and syn > 50:
        return "DDoS", round(0.75 + (min(rate, 50000) / 50000) * 0.20, 3)
    elif rate > 2000 and rst > 5:
        return "DoS", round(0.70 + (min(rate, 20000) / 20000) * 0.20, 3)
    elif syn > 10 and rst > 10 and rate < 500:
        return "Recon", round(0.65 + (min(syn, 100) / 100) * 0.20, 3)
    elif psh > 10 and features.get("TCP", 0) == 1 and tot_sum > 10000:
        return "MQTT_Attack", round(0.65 + (min(psh, 100) / 100) * 0.20, 3)
    elif features.get("Std", 0) > 100 and features.get("Variance", 0) > 50:
        return "Spoofing", round(0.60 + (min(features.get("Std", 0), 500) / 500) * 0.20, 3)
    else:
        return "Benign", round(0.85 + (min(rate, 500) / 500) * 0.10, 3)
