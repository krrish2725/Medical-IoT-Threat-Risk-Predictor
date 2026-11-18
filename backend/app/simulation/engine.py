"""
Simulation engine - generates synthetic network events periodically
for live dashboard demonstration.

All generated events are EXPLICITLY SYNTHETIC. 
No real network traffic is generated or captured.
"""
import asyncio
import logging
import random
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.ml.sample_data import SAMPLE_DEVICES, generate_synthetic_event
from backend.app.risk.scoring import risk_engine
from backend.app.models.entities import Device, Alert, NetworkEvent
from backend.app.ml.model import predictor

logger = logging.getLogger(__name__)


class SimulationEngine:
    """
    Periodically generates synthetic network events for dashboard demonstration.
    
    Uses the trained model for predictions when available;
    otherwise uses a clearly labeled demonstration ruleset.
    """

    def __init__(self):
        self.is_running = False
        self.events_generated = 0
        self.alerts_triggered = 0
        self.interval_seconds = 3.0
        self._task: Optional[asyncio.Task] = None
        self.last_event_time: Optional[str] = None

    async def start(self, db_factory, interval: float = 3.0):
        """Start the simulation loop."""
        if self.is_running:
            logger.warning("Simulation is already running")
            return
        
        self.is_running = True
        self.interval_seconds = interval
        self._task = asyncio.create_task(self._run_loop(db_factory))
        logger.info(f"Simulation started with interval={interval}s")

    async def stop(self):
        """Stop the simulation loop."""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Simulation stopped")

    async def _run_loop(self, db_factory):
        """Main simulation loop."""
        while self.is_running:
            try:
                db: Session = db_factory()
                try:
                    await self._generate_event(db)
                finally:
                    db.close()
                
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Simulation error: {e}")
                await asyncio.sleep(self.interval_seconds)

    async def _generate_event(self, db: Session):
        """Generate a single synthetic event and process it."""
        # Pick a random registered device or a sample device
        devices = db.query(Device).filter(Device.is_active == True).all()
        if devices:
            db_device = random.choice(devices)
            device_info = {
                "device_id": db_device.device_id,
                "name": db_device.name,
                "device_type": db_device.device_type,
                "criticality": db_device.criticality,
                "ip_address": db_device.ip_address or "192.168.10.100",
                "protocol": db_device.protocol or "Wi-Fi",
            }
        else:
            device_info = random.choice(SAMPLE_DEVICES)

        # Generate synthetic event
        event_data = generate_synthetic_event(device=device_info)

        # Attempt ML prediction if model loaded
        if predictor.is_loaded:
            try:
                pred = predictor.predict_single(event_data["features"])
                event_data["predicted_label"] = pred["predicted_label"]
                event_data["predicted_attack_type"] = pred["predicted_attack_type"]
                event_data["confidence"] = pred["confidence"]
            except Exception as e:
                logger.debug(f"ML prediction failed in simulation, using ruleset: {e}")
        
        # Risk assessment
        assessment = risk_engine.assess_event_risk(
            attack_type=event_data["predicted_attack_type"],
            confidence=event_data["confidence"],
            device_criticality=device_info.get("criticality", "Medium"),
            device_type=device_info.get("device_type", "Default"),
        )

        # Save network event
        net_event = NetworkEvent(
            event_id=event_data["event_id"],
            device_id=event_data["device_id"],
            timestamp=datetime.utcnow(),
            protocol=event_data.get("protocol", "Wi-Fi"),
            features=event_data["features"],
            predicted_label=event_data["predicted_label"],
            predicted_attack_type=event_data["predicted_attack_type"],
            confidence=event_data["confidence"],
            risk_score=assessment.risk_score,
            is_synthetic=True,
        )
        db.add(net_event)
        self.events_generated += 1
        self.last_event_time = datetime.utcnow().isoformat()

        # Create alert for malicious events
        if event_data["predicted_label"] == "Attack":
            alert = Alert(
                alert_id=f"ALT-{uuid.uuid4().hex[:12].upper()}",
                device_id=event_data["device_id"],
                device_name=device_info.get("name", "Unknown"),
                attack_type=event_data["predicted_attack_type"],
                severity=assessment.risk_category,
                risk_score=assessment.risk_score,
                likelihood=assessment.likelihood,
                impact=assessment.impact,
                confidence=event_data["confidence"],
                summary=f"[SIMULATED] {event_data['predicted_attack_type']} detected on {device_info.get('name', 'Unknown')}",
                technical_details={
                    "source_ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                    "destination_ip": device_info.get("ip_address", "192.168.10.100"),
                    "factors": assessment.factors,
                    "is_simulated": True,
                },
                suggested_response=assessment.recommended_mitigation,
                status="new",
            )
            db.add(alert)
            self.alerts_triggered += 1

            # Update device risk score
            if devices:
                dev = db.query(Device).filter(Device.device_id == event_data["device_id"]).first()
                if dev:
                    dev.latest_risk_score = assessment.risk_score
                    dev.latest_threat = event_data["predicted_attack_type"]
                    dev.last_seen = datetime.utcnow()

        db.commit()

    def get_status(self) -> dict:
        """Return current simulation status."""
        return {
            "is_running": self.is_running,
            "events_generated": self.events_generated,
            "alerts_triggered": self.alerts_triggered,
            "active_devices": len(SAMPLE_DEVICES),
            "interval_seconds": self.interval_seconds,
            "last_event_time": self.last_event_time,
        }


# Module-level singleton
simulation_engine = SimulationEngine()
