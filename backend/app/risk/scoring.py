"""
Cybersecurity Risk Scoring Engine for Medical IoT Devices.

Risk Score = (Likelihood × Impact / 25) × 100
Range: 0-100

This module is completely independent of the ML model so it can be tested separately.
"""
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass, field

# ─── Device Criticality Profiles ─────────────────────────────────────
# These are DEMONSTRATION ASSUMPTIONS, not authoritative clinical risk ratings.
DEVICE_PROFILES: Dict[str, Dict] = {
    "ICU Patient Monitor": {
        "base_criticality": "Critical",
        "criticality_score": 5,
        "patient_safety_impact": "Direct - continuous vital signs monitoring",
        "data_sensitivity": "High",
        "network_exposure": "High",
    },
    "Smart Infusion Pump": {
        "base_criticality": "Critical",
        "criticality_score": 5,
        "patient_safety_impact": "Direct - medication delivery control",
        "data_sensitivity": "High",
        "network_exposure": "Medium",
    },
    "Wearable Health Monitor": {
        "base_criticality": "High",
        "criticality_score": 4,
        "patient_safety_impact": "Indirect - continuous health metrics",
        "data_sensitivity": "Medium",
        "network_exposure": "High",
    },
    "Connected Medical Sensor": {
        "base_criticality": "High",
        "criticality_score": 4,
        "patient_safety_impact": "Indirect - environmental/biometric sensing",
        "data_sensitivity": "Medium",
        "network_exposure": "Medium",
    },
    "MQTT Health Gateway": {
        "base_criticality": "High",
        "criticality_score": 4,
        "patient_safety_impact": "Indirect - data relay for multiple devices",
        "data_sensitivity": "High",
        "network_exposure": "High",
    },
    "Bluetooth Vital Signs Sensor": {
        "base_criticality": "Medium",
        "criticality_score": 3,
        "patient_safety_impact": "Indirect - periodic vital signs",
        "data_sensitivity": "Medium",
        "network_exposure": "Low",
    },
    "Hospital Network Switch": {
        "base_criticality": "High",
        "criticality_score": 4,
        "patient_safety_impact": "Infrastructure - supports multiple medical devices",
        "data_sensitivity": "Low",
        "network_exposure": "High",
    },
    "Default": {
        "base_criticality": "Medium",
        "criticality_score": 3,
        "patient_safety_impact": "Unknown - conservative assessment",
        "data_sensitivity": "Medium",
        "network_exposure": "Medium",
    },
}

# ─── Threat Impact Mapping ────────────────────────────────────────────
# Maps predicted attack category to a base impact factor (1-5).
THREAT_IMPACT_MAP: Dict[str, int] = {
    "DDoS":         4,   # Can take critical devices offline
    "DoS":          4,   # Can disrupt single device availability
    "Spoofing":     5,   # Can inject false clinical data
    "MQTT_Attack":  4,   # Can intercept or alter health telemetry
    "Recon":        2,   # Information gathering, precursor to attack
    "Benign":       1,   # Normal traffic
}

# ─── Threat Likelihood Mapping ────────────────────────────────────────
# Maps model confidence + attack type to an estimated likelihood score.
THREAT_LIKELIHOOD_RULES: Dict[str, Dict[str, int]] = {
    "high_confidence": {    # confidence >= 0.85
        "DDoS": 5, "DoS": 5, "Spoofing": 5, "MQTT_Attack": 5, "Recon": 4, "Benign": 1,
    },
    "medium_confidence": {  # 0.60 <= confidence < 0.85
        "DDoS": 4, "DoS": 4, "Spoofing": 4, "MQTT_Attack": 4, "Recon": 3, "Benign": 1,
    },
    "low_confidence": {     # confidence < 0.60
        "DDoS": 3, "DoS": 3, "Spoofing": 3, "MQTT_Attack": 3, "Recon": 2, "Benign": 1,
    },
}

CRITICALITY_TO_SCORE = {"Critical": 5, "High": 4, "Medium": 3, "Low": 2}

# ─── Risk Category Thresholds (configurable project defaults) ────────
DEFAULT_THRESHOLDS = {
    "low": 24.0,
    "medium": 49.0,
    "high": 74.0,
    "critical": 100.0,
}


@dataclass
class RiskAssessment:
    """Result of a single event-level risk assessment."""
    risk_score: float
    risk_category: str
    likelihood: int
    impact: int
    factors: List[str] = field(default_factory=list)
    is_complete: bool = True  # False when information is missing
    formula_breakdown: str = ""
    clinical_implication: str = ""
    recommended_mitigation: str = ""


class RiskScoringEngine:
    """
    Configurable risk scoring engine for medical IoT cybersecurity events.
    
    Separates threat likelihood (from ML model output) and impact assessment
    (from threat type + device criticality) into an independent, testable module.
    """

    def __init__(self, thresholds: Optional[Dict[str, float]] = None):
        self.thresholds = thresholds or DEFAULT_THRESHOLDS

    def get_risk_category(self, score: float) -> str:
        """Map numeric risk score to categorical label."""
        if score <= self.thresholds["low"]:
            return "Low"
        elif score <= self.thresholds["medium"]:
            return "Medium"
        elif score <= self.thresholds["high"]:
            return "High"
        else:
            return "Critical"

    def estimate_likelihood(
        self,
        attack_type: str,
        confidence: float,
        override: Optional[int] = None
    ) -> int:
        """
        Estimate threat likelihood (1-5) from model confidence and attack type.
        Uses a documented mapping, not raw confidence as risk.
        """
        if override is not None:
            return max(1, min(5, override))

        if attack_type == "Benign":
            return 1

        if confidence >= 0.85:
            rules = THREAT_LIKELIHOOD_RULES["high_confidence"]
        elif confidence >= 0.60:
            rules = THREAT_LIKELIHOOD_RULES["medium_confidence"]
        else:
            rules = THREAT_LIKELIHOOD_RULES["low_confidence"]

        return rules.get(attack_type, 3)

    def estimate_impact(
        self,
        attack_type: str,
        device_criticality: str = "Medium",
        device_type: str = "Default",
        override: Optional[int] = None
    ) -> int:
        """
        Estimate impact (1-5) using threat type, device criticality, and profile.
        """
        if override is not None:
            return max(1, min(5, override))

        base_threat_impact = THREAT_IMPACT_MAP.get(attack_type, 3)
        crit_score = CRITICALITY_TO_SCORE.get(device_criticality, 3)
        
        # Weighted combination: 60% threat impact, 40% device criticality
        combined = (0.6 * base_threat_impact) + (0.4 * crit_score)
        return max(1, min(5, round(combined)))

    def calculate_risk_score(self, likelihood: int, impact: int) -> float:
        """
        Risk Score = (Likelihood × Impact / 25) × 100
        
        Range: 0-100. Max is when both likelihood and impact are 5.
        """
        raw = (likelihood * impact / 25.0) * 100.0
        return round(max(0.0, min(100.0, raw)), 1)

    def assess_event_risk(
        self,
        attack_type: str,
        confidence: float,
        device_criticality: str = "Medium",
        device_type: str = "Default",
        likelihood_override: Optional[int] = None,
        impact_override: Optional[int] = None,
    ) -> RiskAssessment:
        """
        Complete event-level risk assessment.
        
        Combines ML prediction output with device context to produce
        a risk score, category, explanation, and recommended action.
        """
        factors = []
        is_complete = True

        # Estimate likelihood
        likelihood = self.estimate_likelihood(attack_type, confidence, likelihood_override)
        if likelihood_override is not None:
            factors.append(f"Likelihood manually set to {likelihood_override}")
        else:
            factors.append(f"Likelihood={likelihood} based on {attack_type} at {confidence:.0%} confidence")

        # Estimate impact
        impact = self.estimate_impact(attack_type, device_criticality, device_type, impact_override)
        if impact_override is not None:
            factors.append(f"Impact manually set to {impact_override}")
        else:
            factors.append(f"Impact={impact} from threat={attack_type}, criticality={device_criticality}")

        # Check for missing info
        if device_criticality == "Medium" and device_type == "Default":
            factors.append("Device profile unknown; conservative Medium criticality assumed")
            is_complete = False

        # Calculate score
        risk_score = self.calculate_risk_score(likelihood, impact)
        risk_category = self.get_risk_category(risk_score)
        factors.append(f"Risk Score = ({likelihood} × {impact} / 25) × 100 = {risk_score}")

        # Clinical implication
        clinical = self._get_clinical_implication(attack_type, device_type, risk_category)
        
        # Recommended mitigation
        mitigation = self._get_mitigation(attack_type, risk_category)

        formula_breakdown = (
            f"Risk = (Likelihood[{likelihood}] × Impact[{impact}] / 25) × 100 = {risk_score} → {risk_category}"
        )

        return RiskAssessment(
            risk_score=risk_score,
            risk_category=risk_category,
            likelihood=likelihood,
            impact=impact,
            factors=factors,
            is_complete=is_complete,
            formula_breakdown=formula_breakdown,
            clinical_implication=clinical,
            recommended_mitigation=mitigation,
        )

    def aggregate_device_risk(self, event_scores: List[float]) -> Tuple[float, str]:
        """
        Aggregate multiple event-level risk scores into a device-level risk score.
        
        Method: Weighted combination of maximum and mean recent scores.
        This avoids both understating (pure average) and overstating (pure max) risk.
        Weight: 70% max + 30% mean
        """
        if not event_scores:
            return 0.0, "Low"
        
        max_score = max(event_scores)
        mean_score = sum(event_scores) / len(event_scores)
        aggregated = round(0.7 * max_score + 0.3 * mean_score, 1)
        aggregated = max(0.0, min(100.0, aggregated))
        return aggregated, self.get_risk_category(aggregated)

    def _get_clinical_implication(self, attack_type: str, device_type: str, risk_category: str) -> str:
        implications = {
            ("DDoS", "Critical"): "Potential loss of real-time patient monitoring. Immediate clinical team notification required.",
            ("DDoS", "High"): "Service disruption could delay critical care data delivery.",
            ("DoS", "Critical"): "Targeted device may become unresponsive. Verify manual monitoring backup.",
            ("DoS", "High"): "Device functionality degradation expected. Monitor clinical workflow impact.",
            ("Spoofing", "Critical"): "Risk of falsified clinical data reaching care decisions. Verify all recent readings.",
            ("Spoofing", "High"): "Potential data integrity compromise. Cross-reference with independent sensors.",
            ("MQTT_Attack", "Critical"): "Health telemetry channel compromised. All data from affected sensors suspect.",
            ("MQTT_Attack", "High"): "Message broker integrity at risk. Verify sensor data pipeline.",
            ("Recon", "Critical"): "Active reconnaissance detected. May precede targeted attack on critical infrastructure.",
            ("Recon", "High"): "Network scanning activity. Review perimeter security and access controls.",
        }
        key = (attack_type, risk_category)
        default = f"{attack_type} detected on {device_type}. Risk level: {risk_category}. Monitor and investigate."
        return implications.get(key, default)

    def _get_mitigation(self, attack_type: str, risk_category: str) -> str:
        mitigations = {
            "DDoS": "1. Activate DDoS mitigation on network perimeter. 2. Isolate affected segment. 3. Verify device failover. 4. Notify clinical engineering.",
            "DoS": "1. Rate-limit traffic to affected device. 2. Check device responsiveness. 3. Enable backup monitoring. 4. Investigate source.",
            "Spoofing": "1. Verify device identity and certificates. 2. Check for unauthorized MAC/IP. 3. Validate recent clinical data. 4. Enable strict ARP inspection.",
            "MQTT_Attack": "1. Rotate MQTT credentials. 2. Inspect broker ACLs. 3. Check subscription integrity. 4. Enable TLS if not active.",
            "Recon": "1. Review firewall logs for scan patterns. 2. Block scanning source if external. 3. Audit open ports on medical devices. 4. Update IDS signatures.",
            "Benign": "No action required. Traffic classified as normal.",
        }
        base = mitigations.get(attack_type, "1. Investigate the event. 2. Review network logs. 3. Consult security team.")
        if risk_category in ("Critical", "High"):
            base += " 5. Escalate to security operations team immediately."
        return base


# Module-level singleton for convenience
risk_engine = RiskScoringEngine()
