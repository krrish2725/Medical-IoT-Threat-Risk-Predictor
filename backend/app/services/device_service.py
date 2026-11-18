"""
Device management service - CRUD operations for medical IoT devices.
"""
import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Device
from backend.app.schemas.schemas import DeviceCreate, DeviceUpdate

logger = logging.getLogger(__name__)


def get_all_devices(db: Session, active_only: bool = True) -> List[Device]:
    q = db.query(Device)
    if active_only:
        q = q.filter(Device.is_active == True)
    return q.order_by(Device.created_at.desc()).all()


def get_device(db: Session, device_id: str) -> Optional[Device]:
    return db.query(Device).filter(Device.device_id == device_id).first()


def create_device(db: Session, data: DeviceCreate) -> Device:
    existing = db.query(Device).filter(Device.device_id == data.device_id).first()
    if existing:
        raise ValueError(f"Device {data.device_id} already exists")
    
    device = Device(**data.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def update_device(db: Session, device_id: str, data: DeviceUpdate) -> Optional[Device]:
    device = get_device(db, device_id)
    if not device:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)
    device.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(device)
    return device


def seed_demo_devices(db: Session):
    """Insert sample devices if the table is empty."""
    from backend.app.ml.sample_data import SAMPLE_DEVICES
    
    count = db.query(Device).count()
    if count > 0:
        return
    
    logger.info("Seeding demo devices...")
    for d in SAMPLE_DEVICES:
        device = Device(
            device_id=d["device_id"],
            name=d["name"],
            device_type=d["device_type"],
            department=d["department"],
            criticality=d["criticality"],
            ip_address=d.get("ip_address"),
            mac_address=d.get("mac_address"),
            protocol=d.get("protocol", "Wi-Fi / TCP"),
            status=d.get("status", "online"),
        )
        db.add(device)
    db.commit()
    logger.info(f"Seeded {len(SAMPLE_DEVICES)} demo devices")
