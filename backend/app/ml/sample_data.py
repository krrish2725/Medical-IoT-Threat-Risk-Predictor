"""
Sample / Synthetic data generator for development and UI demonstration.
All generated data is CLEARLY LABELED as synthetic.

This module generates:
1. Sample device records (synthetic hospital equipment)
2. Synthetic network traffic events
3. Demo alerts
"""
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

# ─── Synthetic Device Catalog ─────────────────────────────────────────
SAMPLE_DEVICES = [
    {
        "device_id": "DEV-ICU-001",
        "name": "Philips IntelliVue MX800 - Bed 3",
        "device_type": "ICU Patient Monitor",
        "department": "Intensive Care Unit (ICU)",
        "criticality": "Critical",
        "ip_address": "192.168.10.101",
        "mac_address": "00:1A:2B:3C:4D:01",
        "protocol": "Wi-Fi / TCP",
        "status": "online",
    },
    {
        "device_id": "DEV-ICU-002",
        "name": "GE CARESCAPE B650 - Bed 7",
        "device_type": "ICU Patient Monitor",
        "department": "Intensive Care Unit (ICU)",
        "criticality": "Critical",
        "ip_address": "192.168.10.102",
        "mac_address": "00:1A:2B:3C:4D:02",
        "protocol": "Wi-Fi / TCP",
        "status": "online",
    },
    {
        "device_id": "DEV-INF-001",
        "name": "BD Alaris Infusion System - Station A",
        "device_type": "Smart Infusion Pump",
        "department": "Pharmacy / ICU",
        "criticality": "Critical",
        "ip_address": "192.168.10.201",
        "mac_address": "00:1A:2B:3C:4D:03",
        "protocol": "Wi-Fi / TCP",
        "status": "online",
    },
    {
        "device_id": "DEV-INF-002",
        "name": "Baxter Sigma Spectrum - Station B",
        "device_type": "Smart Infusion Pump",
        "department": "Oncology",
        "criticality": "Critical",
        "ip_address": "192.168.10.202",
        "mac_address": "00:1A:2B:3C:4D:04",
        "protocol": "Wi-Fi / TCP",
        "status": "online",
    },
    {
        "device_id": "DEV-WRB-001",
        "name": "Masimo Radius PPG - Ambulatory",
        "device_type": "Wearable Health Monitor",
        "department": "General Ward",
        "criticality": "High",
        "ip_address": "192.168.10.301",
        "mac_address": "00:1A:2B:3C:4D:05",
        "protocol": "BLE / Wi-Fi",
        "status": "online",
    },
    {
        "device_id": "DEV-SNS-001",
        "name": "Dräger Infinity M540 Sensor",
        "device_type": "Connected Medical Sensor",
        "department": "Emergency Department",
        "criticality": "High",
        "ip_address": "192.168.10.401",
        "mac_address": "00:1A:2B:3C:4D:06",
        "protocol": "Wi-Fi / MQTT",
        "status": "online",
    },
    {
        "device_id": "DEV-GW-001",
        "name": "Mosquitto MQTT Broker - Medical IoT Hub",
        "device_type": "MQTT Health Gateway",
        "department": "IT Infrastructure",
        "criticality": "High",
        "ip_address": "192.168.10.10",
        "mac_address": "00:1A:2B:3C:4D:07",
        "protocol": "MQTT / TCP",
        "status": "online",
    },
    {
        "device_id": "DEV-BLE-001",
        "name": "Nonin WristOx2 3150 - Floor 2",
        "device_type": "Bluetooth Vital Signs Sensor",
        "department": "Cardiology",
        "criticality": "Medium",
        "ip_address": "192.168.10.501",
        "mac_address": "00:1A:2B:3C:4D:08",
        "protocol": "BLE",
        "status": "online",
    },
    {
        "device_id": "DEV-NET-001",
        "name": "Cisco Catalyst 9200L - Medical VLAN",
        "device_type": "Hospital Network Switch",
        "department": "IT Infrastructure",
        "criticality": "High",
        "ip_address": "192.168.10.1",
        "mac_address": "00:1A:2B:3C:4D:09",
        "protocol": "Ethernet / TCP",
        "status": "online",
    },
    {
        "device_id": "DEV-WRB-002",
        "name": "Biobeat Chest Monitor BB-613WP",
        "device_type": "Wearable Health Monitor",
        "department": "Post-Operative Care",
        "criticality": "High",
        "ip_address": "192.168.10.302",
        "mac_address": "00:1A:2B:3C:4D:10",
        "protocol": "Wi-Fi / BLE",
        "status": "offline",
    },
]

# Synthetic CICIoMT2024-like feature names
FLOW_FEATURES = [
    "flow_duration", "Header_Length", "Protocol Type", "Duration",
    "Rate", "Srate", "Drate", "fin_flag_number", "syn_flag_number",
    "rst_flag_number", "psh_flag_number", "ack_flag_number",
    "ece_flag_number", "cwr_flag_number", "ack_count",
    "syn_count", "fin_count", "urg_count", "rst_count",
    "HTTP", "HTTPS", "DNS", "Telnet", "SMTP", "SSH", "IRC",
    "TCP", "UDP", "DHCP", "ARP", "ICMP", "IPv", "LLC",
    "Tot sum", "Min", "Max", "AVG", "Std", "Tot size",
    "IAT", "Number", "Magnitue", "Radius", "Covariance",
    "Variance", "Weight",
]

ATTACK_TYPES = ["Benign", "DDoS", "DoS", "Recon", "MQTT_Attack", "Spoofing"]

# ─── Feature generation profiles per attack type ─────────────────────
def _generate_benign_features() -> Dict[str, float]:
    return {
        "flow_duration": round(random.uniform(0.01, 2.0), 4),
        "Header_Length": random.randint(20, 60),
        "Rate": round(random.uniform(10, 500), 2),
        "Srate": round(random.uniform(5, 200), 2),
        "Drate": round(random.uniform(5, 200), 2),
        "syn_flag_number": random.randint(0, 2),
        "ack_flag_number": random.randint(0, 5),
        "fin_flag_number": random.randint(0, 2),
        "rst_flag_number": 0,
        "psh_flag_number": random.randint(0, 3),
        "TCP": random.choice([0, 1]),
        "UDP": random.choice([0, 1]),
        "Tot sum": round(random.uniform(100, 5000), 2),
        "Min": round(random.uniform(40, 80), 2),
        "Max": round(random.uniform(200, 1500), 2),
        "AVG": round(random.uniform(80, 400), 2),
        "Std": round(random.uniform(10, 100), 2),
        "Tot size": random.randint(500, 10000),
        "IAT": round(random.uniform(0.001, 0.5), 4),
        "Number": random.randint(1, 50),
        "Magnitue": round(random.uniform(1, 20), 2),
        "Radius": round(random.uniform(0.5, 10), 2),
        "Covariance": round(random.uniform(-5, 5), 2),
        "Variance": round(random.uniform(0, 50), 2),
        "Weight": round(random.uniform(1, 10), 2),
    }


def _generate_attack_features(attack_type: str) -> Dict[str, float]:
    base = _generate_benign_features()
    if attack_type == "DDoS":
        base["Rate"] = round(random.uniform(5000, 50000), 2)
        base["Srate"] = round(random.uniform(3000, 30000), 2)
        base["syn_flag_number"] = random.randint(50, 500)
        base["Tot sum"] = round(random.uniform(50000, 500000), 2)
        base["Number"] = random.randint(500, 5000)
        base["Tot size"] = random.randint(100000, 1000000)
    elif attack_type == "DoS":
        base["Rate"] = round(random.uniform(2000, 20000), 2)
        base["Srate"] = round(random.uniform(1000, 10000), 2)
        base["syn_flag_number"] = random.randint(20, 200)
        base["rst_flag_number"] = random.randint(5, 50)
        base["Number"] = random.randint(200, 2000)
    elif attack_type == "Recon":
        base["Rate"] = round(random.uniform(50, 500), 2)
        base["syn_flag_number"] = random.randint(10, 100)
        base["rst_flag_number"] = random.randint(10, 80)
        base["fin_flag_number"] = random.randint(0, 5)
        base["Number"] = random.randint(50, 300)
        base["flow_duration"] = round(random.uniform(0.001, 0.1), 4)
    elif attack_type == "MQTT_Attack":
        base["Rate"] = round(random.uniform(100, 3000), 2)
        base["TCP"] = 1
        base["psh_flag_number"] = random.randint(10, 100)
        base["ack_flag_number"] = random.randint(20, 200)
        base["Tot sum"] = round(random.uniform(10000, 100000), 2)
    elif attack_type == "Spoofing":
        base["Rate"] = round(random.uniform(100, 2000), 2)
        base["ack_flag_number"] = random.randint(5, 50)
        base["Std"] = round(random.uniform(100, 500), 2)
        base["Variance"] = round(random.uniform(50, 300), 2)
    return base


def generate_synthetic_event(
    device: Optional[Dict] = None,
    attack_type: Optional[str] = None,
    timestamp: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Generate a single synthetic network event with realistic features."""
    if device is None:
        device = random.choice(SAMPLE_DEVICES)
    if attack_type is None:
        # 60% benign, 40% attack (weighted)
        attack_type = random.choices(
            ATTACK_TYPES,
            weights=[60, 10, 8, 8, 7, 7],
            k=1
        )[0]
    if timestamp is None:
        timestamp = datetime.utcnow()

    if attack_type == "Benign":
        features = _generate_benign_features()
        confidence = round(random.uniform(0.85, 0.99), 3)
    else:
        features = _generate_attack_features(attack_type)
        confidence = round(random.uniform(0.60, 0.98), 3)

    return {
        "event_id": f"EVT-{uuid.uuid4().hex[:12].upper()}",
        "device_id": device["device_id"],
        "device_name": device.get("name", "Unknown"),
        "device_type": device.get("device_type", "Default"),
        "device_criticality": device.get("criticality", "Medium"),
        "timestamp": timestamp,
        "protocol": device.get("protocol", "Wi-Fi"),
        "features": features,
        "predicted_label": "Benign" if attack_type == "Benign" else "Attack",
        "predicted_attack_type": attack_type,
        "confidence": confidence,
        "is_synthetic": True,
    }


def generate_sample_dataset(
    n_samples: int = 1000,
    seed: int = 42,
    save_path: Optional[str] = None,
) -> pd.DataFrame:
    """
    Generate a synthetic CICIoMT2024-like dataset for development/demonstration.
    
    ALL DATA IS SYNTHETIC. Clearly labeled with 'is_synthetic' column.
    """
    random.seed(seed)
    np.random.seed(seed)

    records = []
    attack_distribution = {
        "Benign": int(n_samples * 0.55),
        "DDoS": int(n_samples * 0.12),
        "DoS": int(n_samples * 0.10),
        "Recon": int(n_samples * 0.10),
        "MQTT_Attack": int(n_samples * 0.07),
        "Spoofing": int(n_samples * 0.06),
    }
    # Fill remainder
    remainder = n_samples - sum(attack_distribution.values())
    attack_distribution["Benign"] += remainder

    base_time = datetime.utcnow() - timedelta(hours=24)

    for attack_type, count in attack_distribution.items():
        for i in range(count):
            device = random.choice(SAMPLE_DEVICES)
            ts = base_time + timedelta(seconds=random.uniform(0, 86400))
            if attack_type == "Benign":
                features = _generate_benign_features()
            else:
                features = _generate_attack_features(attack_type)
            
            row = {**features}
            row["label"] = attack_type
            row["is_synthetic"] = True
            records.append(row)

    df = pd.DataFrame(records)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)

    if save_path:
        df.to_csv(save_path, index=False)
    
    return df


def generate_demo_alerts(n_alerts: int = 15, seed: int = 42) -> List[Dict[str, Any]]:
    """Generate demo alert records for UI demonstration."""
    random.seed(seed)
    
    alerts = []
    statuses = ["new", "new", "new", "investigating", "investigating", "resolved", "false_positive"]
    
    for i in range(n_alerts):
        device = random.choice(SAMPLE_DEVICES)
        attack = random.choice(["DDoS", "DoS", "Recon", "MQTT_Attack", "Spoofing"])
        confidence = round(random.uniform(0.60, 0.98), 3)
        
        # Import here to avoid circular dependency
        from backend.app.risk.scoring import risk_engine
        assessment = risk_engine.assess_event_risk(
            attack_type=attack,
            confidence=confidence,
            device_criticality=device["criticality"],
            device_type=device["device_type"],
        )

        alerts.append({
            "alert_id": f"ALT-{uuid.uuid4().hex[:12].upper()}",
            "device_id": device["device_id"],
            "device_name": device["name"],
            "attack_type": attack,
            "severity": assessment.risk_category,
            "risk_score": assessment.risk_score,
            "likelihood": assessment.likelihood,
            "impact": assessment.impact,
            "confidence": confidence,
            "summary": f"{attack} activity detected on {device['name']} ({device['department']})",
            "technical_details": {
                "source_ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                "destination_ip": device["ip_address"],
                "factors": assessment.factors,
            },
            "suggested_response": assessment.recommended_mitigation,
            "status": random.choice(statuses),
            "created_at": datetime.utcnow() - timedelta(minutes=random.randint(5, 1440)),
            "updated_at": datetime.utcnow() - timedelta(minutes=random.randint(0, 60)),
        })

    # Sort by created_at descending
    alerts.sort(key=lambda a: a["created_at"], reverse=True)
    return alerts
