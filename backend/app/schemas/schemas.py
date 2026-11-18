"""
Pydantic schemas for data validation and API request/response serialization.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# ----------------- Device Schemas -----------------
class DeviceBase(BaseModel):
    device_id: str = Field(..., description="Unique alphanumeric identifier (e.g., DEV-ICU-001)")
    name: str = Field(..., description="Device model or hospital equipment label")
    device_type: str = Field(..., description="e.g. ICU Patient Monitor, Smart Infusion Pump")
    department: str = Field(..., description="e.g. Intensive Care Unit, Cardiology")
    criticality: str = Field("Medium", description="Critical, High, Medium, Low")
    ip_address: Optional[str] = Field(None, description="Static or assigned IP address")
    mac_address: Optional[str] = Field(None, description="Hardware MAC address")
    protocol: Optional[str] = Field("Wi-Fi / TCP", description="Primary communication protocol")
    status: Optional[str] = Field("online", description="online, offline, compromised, maintenance")

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    department: Optional[str] = None
    criticality: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    protocol: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class DeviceResponse(DeviceBase):
    id: int
    latest_risk_score: float
    latest_threat: str
    last_seen: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------- Alert Schemas -----------------
class AlertResponse(BaseModel):
    id: int
    alert_id: str
    device_id: str
    device_name: Optional[str] = None
    attack_type: str
    severity: str
    risk_score: float
    likelihood: int
    impact: int
    confidence: float
    summary: str
    technical_details: Optional[Dict[str, Any]] = None
    suggested_response: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="new, investigating, resolved, false_positive")


# ----------------- Prediction & Threat Schemas -----------------
class FeatureContribution(BaseModel):
    feature: str
    value: float
    importance: float
    effect: str  # increases_risk or decreases_risk

class SinglePredictionRequest(BaseModel):
    device_id: Optional[str] = "DEV-GEN-001"
    features: Dict[str, float] = Field(..., description="Dictionary of numeric flow metrics")
    protocol: Optional[str] = "Wi-Fi"

class PredictionResponse(BaseModel):
    predicted_label: str  # Benign or Attack
    predicted_attack_type: str  # Benign, DDoS, DoS, Recon, MQTT_Attack, Spoofing
    confidence: float  # 0.0 to 1.0
    risk_score: float  # 0.0 to 100.0
    risk_category: str  # Low, Medium, High, Critical
    likelihood: int  # 1 to 5
    impact: int  # 1 to 5
    contributing_factors: List[FeatureContribution] = []
    recommended_action: str
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    is_synthetic: bool = False

class BatchPredictionItem(BaseModel):
    row_index: int
    device_id: Optional[str] = None
    predicted_label: str
    predicted_attack_type: str
    confidence: float
    risk_score: float
    risk_category: str
    key_features: Dict[str, float]

class BatchPredictionResponse(BaseModel):
    total_records: int
    attack_count: int
    benign_count: int
    high_critical_count: int
    results: List[BatchPredictionItem]
    distribution: Dict[str, int]


# ----------------- What-If Risk Analysis -----------------
class WhatIfRequest(BaseModel):
    device_id: Optional[str] = None
    device_criticality: str = Field("High", description="Critical, High, Medium, Low")
    threat_category: str = Field("DDoS", description="Benign, Recon, MQTT_Attack, DoS, DDoS, Spoofing")
    likelihood_override: Optional[int] = Field(None, ge=1, le=5)
    impact_override: Optional[int] = Field(None, ge=1, le=5)

class WhatIfResponse(BaseModel):
    device_id: Optional[str]
    device_criticality: str
    threat_category: str
    calculated_likelihood: int
    calculated_impact: int
    risk_score: float
    risk_category: str
    formula_breakdown: str
    clinical_implication: str
    recommended_mitigation: str
    is_simulation: bool = True


# ----------------- Dashboard & Reporting -----------------
class MetricDistribution(BaseModel):
    name: str
    value: int
    color: Optional[str] = None

class RiskTrendPoint(BaseModel):
    time: str
    avg_risk: float
    max_risk: float
    threat_count: int

class DashboardSummary(BaseModel):
    total_devices: int
    devices_requiring_investigation: int
    suspicious_events: int
    high_critical_events: int
    threat_distribution: List[MetricDistribution]
    risk_distribution: List[MetricDistribution]
    criticality_distribution: List[MetricDistribution]
    recent_alerts: List[AlertResponse]
    model_status: Dict[str, Any]
    demo_mode: bool


# ----------------- Model Performance -----------------
class ModelMetricsSummary(BaseModel):
    model_name: str
    version: str
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    fpr: float
    fnr: float
    confusion_matrix: List[List[int]]
    classes: List[str]
    per_class_metrics: Dict[str, Dict[str, float]]
    feature_importances: List[Dict[str, Any]]
    training_duration_seconds: float
    dataset_samples: int
    dataset_name: str
    trained_at: str


# ----------------- Simulation -----------------
class SimulationStatus(BaseModel):
    is_running: bool
    events_generated: int
    alerts_triggered: int
    active_devices: int
    interval_seconds: float
    last_event_time: Optional[str] = None
