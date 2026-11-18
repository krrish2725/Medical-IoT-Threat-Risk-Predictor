"""
SQLAlchemy ORM Entities for Medical IoT Cybersecurity Risk Prediction.
Models: Device, Alert, NetworkEvent, ModelArtifact.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    device_type = Column(String(64), nullable=False)  # e.g., ICU Patient Monitor, Smart Infusion Pump
    department = Column(String(64), nullable=False)   # e.g., Intensive Care Unit (ICU)
    criticality = Column(String(20), nullable=False, default="Medium")  # Critical, High, Medium, Low
    ip_address = Column(String(45), nullable=True)
    mac_address = Column(String(20), nullable=True)
    protocol = Column(String(32), default="Wi-Fi / TCP")  # Wi-Fi, MQTT, BLE
    status = Column(String(20), default="online")  # online, offline, compromised, maintenance
    latest_risk_score = Column(Float, default=0.0)
    latest_threat = Column(String(64), default="None")
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")
    events = relationship("NetworkEvent", back_populates="device", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(64), unique=True, index=True, nullable=False)
    device_id = Column(String(64), ForeignKey("devices.device_id"), index=True, nullable=False)
    device_name = Column(String(128), nullable=True)
    attack_type = Column(String(64), nullable=False)  # DDoS, DoS, Recon, MQTT_Attack, Spoofing
    severity = Column(String(20), nullable=False)     # Critical, High, Medium, Low
    risk_score = Column(Float, nullable=False)        # 0.0 to 100.0
    likelihood = Column(Integer, default=1)           # 1 to 5
    impact = Column(Integer, default=1)               # 1 to 5
    confidence = Column(Float, default=0.0)           # 0.0 to 1.0
    summary = Column(String(256), nullable=False)
    technical_details = Column(JSON, nullable=True)   # Feature values, SHAP factors, source IP
    suggested_response = Column(Text, nullable=True)  # Recommended clinical containment actions
    status = Column(String(32), default="new")        # new, investigating, resolved, false_positive
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    device = relationship("Device", back_populates="alerts")


class NetworkEvent(Base):
    __tablename__ = "network_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    device_id = Column(String(64), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    protocol = Column(String(32), default="Wi-Fi")
    features = Column(JSON, nullable=True)  # Flow metrics: rate, packet size, flags
    predicted_label = Column(String(20), nullable=False)       # Benign or Attack
    predicted_attack_type = Column(String(64), nullable=False) # Specific category
    confidence = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    is_synthetic = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    device = relationship("Device", back_populates="events")


class ModelArtifact(Base):
    __tablename__ = "model_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(64), nullable=False)  # e.g., RandomForestClassifier, XGBClassifier
    version = Column(String(32), nullable=False)
    accuracy = Column(Float, nullable=False)
    precision_macro = Column(Float, nullable=False)
    recall_macro = Column(Float, nullable=False)
    f1_macro = Column(Float, nullable=False)
    fpr = Column(Float, default=0.0)  # False Positive Rate
    fnr = Column(Float, default=0.0)  # False Negative Rate
    confusion_matrix = Column(JSON, nullable=True)
    per_class_metrics = Column(JSON, nullable=True)
    feature_importances = Column(JSON, nullable=True)
    training_duration_seconds = Column(Float, default=0.0)
    evaluation_duration_seconds = Column(Float, default=0.0)
    dataset_samples = Column(Integer, default=0)
    dataset_name = Column(String(128), default="CICIoMT2024")
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
