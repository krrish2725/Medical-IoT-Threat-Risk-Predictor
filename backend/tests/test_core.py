"""
Tests for the Medical IoMT Cybersecurity Risk Prediction System.
"""
import pytest
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.risk.scoring import RiskScoringEngine, risk_engine
from backend.app.ml.sample_data import (
    generate_synthetic_event, generate_sample_dataset,
    SAMPLE_DEVICES, generate_demo_alerts,
)


# ======================= Risk Scoring Tests =======================

class TestRiskScoringEngine:
    def setup_method(self):
        self.engine = RiskScoringEngine()

    def test_risk_score_formula(self):
        """Risk Score = (L × I / 25) × 100"""
        assert self.engine.calculate_risk_score(5, 5) == 100.0
        assert self.engine.calculate_risk_score(1, 1) == 4.0
        assert self.engine.calculate_risk_score(3, 3) == 36.0
        assert self.engine.calculate_risk_score(5, 1) == 20.0

    def test_risk_categories(self):
        assert self.engine.get_risk_category(0) == "Low"
        assert self.engine.get_risk_category(24) == "Low"
        assert self.engine.get_risk_category(25) == "Medium"
        assert self.engine.get_risk_category(49) == "Medium"
        assert self.engine.get_risk_category(50) == "High"
        assert self.engine.get_risk_category(74) == "High"
        assert self.engine.get_risk_category(75) == "Critical"
        assert self.engine.get_risk_category(100) == "Critical"

    def test_benign_always_low_risk(self):
        assessment = self.engine.assess_event_risk("Benign", 0.99, "Critical")
        assert assessment.likelihood == 1
        assert assessment.risk_score <= 24.0
        assert assessment.risk_category == "Low"

    def test_ddos_on_critical_device(self):
        assessment = self.engine.assess_event_risk("DDoS", 0.95, "Critical")
        assert assessment.likelihood >= 4
        assert assessment.impact >= 4
        assert assessment.risk_score >= 50.0

    def test_recon_lower_than_ddos(self):
        recon = self.engine.assess_event_risk("Recon", 0.80, "Medium")
        ddos = self.engine.assess_event_risk("DDoS", 0.80, "Medium")
        assert recon.risk_score < ddos.risk_score

    def test_override_likelihood(self):
        assessment = self.engine.assess_event_risk("DDoS", 0.95, likelihood_override=1)
        assert assessment.likelihood == 1

    def test_override_impact(self):
        assessment = self.engine.assess_event_risk("DDoS", 0.95, impact_override=1)
        assert assessment.impact == 1

    def test_device_criticality_affects_impact(self):
        critical = self.engine.assess_event_risk("DoS", 0.80, "Critical")
        low = self.engine.assess_event_risk("DoS", 0.80, "Low")
        assert critical.impact >= low.impact

    def test_aggregate_device_risk(self):
        scores = [80.0, 40.0, 60.0]
        agg, cat = self.engine.aggregate_device_risk(scores)
        # 70% max (80) + 30% mean (60) = 56 + 18 = 74
        assert agg == 74.0
        assert cat == "High"

    def test_aggregate_empty(self):
        agg, cat = self.engine.aggregate_device_risk([])
        assert agg == 0.0
        assert cat == "Low"

    def test_assessment_has_factors(self):
        assessment = self.engine.assess_event_risk("DDoS", 0.90, "Critical")
        assert len(assessment.factors) > 0
        assert assessment.formula_breakdown != ""
        assert assessment.clinical_implication != ""
        assert assessment.recommended_mitigation != ""

    def test_missing_device_info_flags_incomplete(self):
        assessment = self.engine.assess_event_risk("DDoS", 0.90, "Medium", "Default")
        assert assessment.is_complete == False

    def test_score_never_exceeds_100(self):
        score = self.engine.calculate_risk_score(10, 10)  # Out of normal range
        assert score <= 100.0

    def test_score_never_below_zero(self):
        score = self.engine.calculate_risk_score(0, 0)
        assert score >= 0.0


# ======================= Sample Data Tests =======================

class TestSampleData:
    def test_generate_synthetic_event(self):
        event = generate_synthetic_event()
        assert event["event_id"].startswith("EVT-")
        assert event["is_synthetic"] == True
        assert event["predicted_label"] in ("Benign", "Attack")
        assert event["predicted_attack_type"] in ("Benign", "DDoS", "DoS", "Recon", "MQTT_Attack", "Spoofing")
        assert 0.0 <= event["confidence"] <= 1.0
        assert isinstance(event["features"], dict)
        assert len(event["features"]) > 0

    def test_generate_with_specific_attack(self):
        event = generate_synthetic_event(attack_type="DDoS")
        assert event["predicted_attack_type"] == "DDoS"
        assert event["predicted_label"] == "Attack"
        assert event["features"]["Rate"] > 1000

    def test_sample_dataset_size(self):
        df = generate_sample_dataset(n_samples=100, seed=42)
        assert len(df) == 100
        assert "label" in df.columns
        assert "is_synthetic" in df.columns
        assert df["is_synthetic"].all()

    def test_sample_dataset_class_distribution(self):
        df = generate_sample_dataset(n_samples=1000, seed=42)
        classes = df["label"].value_counts()
        assert "Benign" in classes.index
        assert len(classes) >= 5  # At least 5 attack types + benign

    def test_demo_alerts_count(self):
        alerts = generate_demo_alerts(n_alerts=10)
        assert len(alerts) == 10
        for a in alerts:
            assert a["alert_id"].startswith("ALT-")
            assert a["attack_type"] in ("DDoS", "DoS", "Recon", "MQTT_Attack", "Spoofing")
            assert 0 <= a["risk_score"] <= 100

    def test_sample_devices_exist(self):
        assert len(SAMPLE_DEVICES) >= 5
        for d in SAMPLE_DEVICES:
            assert "device_id" in d
            assert "name" in d
            assert "device_type" in d
            assert "criticality" in d


# ======================= Data Pipeline Tests =======================

class TestDataPipeline:
    def test_load_generates_synthetic_when_no_data(self):
        from backend.app.ml.data_pipeline import DataPipeline
        pipeline = DataPipeline()
        df = pipeline.load_dataset()
        assert len(df) > 0
        assert "label" in df.columns

    def test_clean_removes_duplicates(self):
        from backend.app.ml.data_pipeline import DataPipeline
        import pandas as pd
        pipeline = DataPipeline()
        df = generate_sample_dataset(n_samples=100, seed=42)
        df = pd.concat([df, df.iloc[:10]], ignore_index=True)
        assert len(df) == 110
        cleaned = pipeline.clean_data(df)
        assert len(cleaned) <= 100

    def test_feature_selection(self):
        from backend.app.ml.data_pipeline import DataPipeline
        pipeline = DataPipeline()
        df = generate_sample_dataset(n_samples=100, seed=42)
        df = pipeline.clean_data(df)
        X, y = pipeline.select_features(df)
        assert "label" not in X.columns
        assert "is_synthetic" not in X.columns
        assert len(pipeline.feature_columns) > 0
        assert len(y) == len(X)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
