"""
Dashboard aggregation service - computes summary statistics from the database.
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.entities import Device, Alert, NetworkEvent
from backend.app.ml.model import predictor
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

SEVERITY_COLORS = {
    "Critical": "#ef4444",
    "High": "#f59e0b",
    "Medium": "#3b82f6",
    "Low": "#10b981",
}

ATTACK_COLORS = {
    "DDoS": "#ef4444",
    "DoS": "#f97316",
    "Spoofing": "#a855f7",
    "MQTT_Attack": "#06b6d4",
    "Recon": "#eab308",
    "Benign": "#10b981",
}


def get_dashboard_summary(db: Session) -> Dict[str, Any]:
    """Compute all dashboard summary metrics from the database."""
    
    # Device counts
    total_devices = db.query(Device).filter(Device.is_active == True).count()
    devices_investigating = db.query(Device).filter(
        Device.is_active == True,
        Device.latest_risk_score >= 50
    ).count()

    # Event/alert counts
    suspicious_events = db.query(NetworkEvent).filter(
        NetworkEvent.predicted_label == "Attack"
    ).count()
    
    high_critical = db.query(Alert).filter(
        Alert.severity.in_(["High", "Critical"]),
        Alert.status.in_(["new", "investigating"])
    ).count()

    # Threat distribution (from alerts)
    threat_dist_query = db.query(
        Alert.attack_type, func.count(Alert.id)
    ).group_by(Alert.attack_type).all()
    
    threat_distribution = [
        {"name": t, "value": c, "color": ATTACK_COLORS.get(t, "#6b7280")}
        for t, c in threat_dist_query
    ]

    # Risk distribution (from alerts)
    risk_dist_query = db.query(
        Alert.severity, func.count(Alert.id)
    ).group_by(Alert.severity).all()
    
    risk_distribution = [
        {"name": s, "value": c, "color": SEVERITY_COLORS.get(s, "#6b7280")}
        for s, c in risk_dist_query
    ]

    # Criticality distribution (from devices)
    crit_dist_query = db.query(
        Device.criticality, func.count(Device.id)
    ).filter(Device.is_active == True).group_by(Device.criticality).all()
    
    criticality_distribution = [
        {"name": c, "value": n, "color": SEVERITY_COLORS.get(c, "#6b7280")}
        for c, n in crit_dist_query
    ]

    # Recent alerts (last 10)
    recent_alerts = db.query(Alert).order_by(
        Alert.created_at.desc()
    ).limit(10).all()

    recent_alerts_data = []
    for a in recent_alerts:
        recent_alerts_data.append({
            "id": a.id,
            "alert_id": a.alert_id,
            "device_id": a.device_id,
            "device_name": a.device_name,
            "attack_type": a.attack_type,
            "severity": a.severity,
            "risk_score": a.risk_score,
            "likelihood": a.likelihood,
            "impact": a.impact,
            "confidence": a.confidence,
            "summary": a.summary,
            "technical_details": a.technical_details,
            "suggested_response": a.suggested_response,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        })

    # Model status
    model_status = predictor.get_model_status()

    return {
        "total_devices": total_devices,
        "devices_requiring_investigation": devices_investigating,
        "suspicious_events": suspicious_events,
        "high_critical_events": high_critical,
        "threat_distribution": threat_distribution,
        "risk_distribution": risk_distribution,
        "criticality_distribution": criticality_distribution,
        "recent_alerts": recent_alerts_data,
        "model_status": model_status,
        "demo_mode": settings.DEMO_MODE,
    }


def get_report_summary(db: Session) -> Dict[str, Any]:
    """Generate a comprehensive report summary."""
    dashboard = get_dashboard_summary(db)
    
    # Device-level risk summaries
    devices = db.query(Device).filter(Device.is_active == True).all()
    device_risks = []
    for d in devices:
        alert_count = db.query(Alert).filter(Alert.device_id == d.device_id).count()
        device_risks.append({
            "device_id": d.device_id,
            "name": d.name,
            "device_type": d.device_type,
            "department": d.department,
            "criticality": d.criticality,
            "latest_risk_score": d.latest_risk_score,
            "latest_threat": d.latest_threat,
            "alert_count": alert_count,
            "status": d.status,
        })
    
    device_risks.sort(key=lambda x: x["latest_risk_score"], reverse=True)

    return {
        **dashboard,
        "device_risk_summaries": device_risks,
        "report_generated_at": datetime.utcnow().isoformat(),
        "report_type": "Comprehensive Security Assessment",
    }
