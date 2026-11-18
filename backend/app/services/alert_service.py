"""
Alert management service.
"""
import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Alert

logger = logging.getLogger(__name__)

VALID_STATUSES = {"new", "investigating", "resolved", "false_positive"}


def get_alerts(
    db: Session,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    device_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Alert]:
    q = db.query(Alert)
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    if device_id:
        q = q.filter(Alert.device_id == device_id)
    return q.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()


def get_alert_count(db: Session, status: Optional[str] = None) -> int:
    q = db.query(Alert)
    if status:
        q = q.filter(Alert.status == status)
    return q.count()


def update_alert_status(db: Session, alert_id: str, new_status: str) -> Optional[Alert]:
    if new_status not in VALID_STATUSES:
        raise ValueError(f"Invalid status: {new_status}. Must be one of {VALID_STATUSES}")
    
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        return None
    
    alert.status = new_status
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


def seed_demo_alerts(db: Session):
    """Insert sample alerts if the table is empty."""
    count = db.query(Alert).count()
    if count > 0:
        return
    
    logger.info("Seeding demo alerts...")
    from backend.app.ml.sample_data import generate_demo_alerts
    demo_alerts = generate_demo_alerts(n_alerts=20)
    
    for a in demo_alerts:
        alert = Alert(
            alert_id=a["alert_id"],
            device_id=a["device_id"],
            device_name=a.get("device_name"),
            attack_type=a["attack_type"],
            severity=a["severity"],
            risk_score=a["risk_score"],
            likelihood=a["likelihood"],
            impact=a["impact"],
            confidence=a["confidence"],
            summary=a["summary"],
            technical_details=a.get("technical_details"),
            suggested_response=a.get("suggested_response"),
            status=a.get("status", "new"),
            created_at=a.get("created_at", datetime.utcnow()),
            updated_at=a.get("updated_at", datetime.utcnow()),
        )
        db.add(alert)
    db.commit()
    logger.info(f"Seeded {len(demo_alerts)} demo alerts")
