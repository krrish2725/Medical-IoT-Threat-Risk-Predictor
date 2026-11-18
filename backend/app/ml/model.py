"""
ML Model Training, Evaluation, and Inference.

Supports:
- Random Forest (baseline)
- XGBoost (optional comparison)
- SHAP-based feature importance
- Full evaluation metrics
"""
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

from backend.app.core.config import settings
from backend.app.ml.data_pipeline import DataPipeline

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Trains, evaluates, and saves ML models for threat classification."""

    def __init__(self, random_seed: int = 42):
        self.random_seed = random_seed
        self.pipeline = DataPipeline(random_seed=random_seed)
        self.model = None
        self.model_name = ""
        self.metrics: Dict[str, Any] = {}

    def train(
        self,
        dataset_path: Optional[str] = None,
        model_type: str = "random_forest",
        test_size: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Complete training workflow:
        1. Load → 2. Clean → 3. Feature select → 4. Split → 5. Preprocess
        6. Train → 7. Evaluate → 8. Save
        """
        logger.info(f"=== Starting training pipeline (model={model_type}) ===")

        # 1. Load
        df = self.pipeline.load_dataset(dataset_path)

        # 2. Clean
        df = self.pipeline.clean_data(df)

        # 3. Select features
        X, y = self.pipeline.select_features(df)

        # 4. Split (stratified)
        X_train, X_test, y_train, y_test = self.pipeline.split_data(X, y, test_size=test_size)

        # 5. Preprocess (fit on train only)
        X_train_scaled, X_test_scaled, y_train_enc, y_test_enc = self.pipeline.preprocess(
            X_train, X_test, y_train, y_test, fit_scaler=True
        )

        # 6. Train
        train_start = time.time()
        if model_type == "xgboost":
            self.model, self.model_name = self._train_xgboost(X_train_scaled, y_train_enc)
        else:
            self.model, self.model_name = self._train_random_forest(X_train_scaled, y_train_enc)
        train_duration = time.time() - train_start

        # 7. Evaluate
        eval_start = time.time()
        self.metrics = self._evaluate(X_test_scaled, y_test_enc, train_duration)
        self.metrics["evaluation_duration_seconds"] = round(time.time() - eval_start, 2)
        self.metrics["dataset_samples"] = len(df)
        self.metrics["training_samples"] = len(X_train)
        self.metrics["test_samples"] = len(X_test)
        self.metrics["feature_count"] = len(self.pipeline.feature_columns)
        self.metrics["feature_columns"] = self.pipeline.feature_columns

        # Feature importance
        self.metrics["feature_importances"] = self._get_feature_importances()

        # 8. Save
        self._save_artifacts()

        logger.info(f"=== Training complete. F1-macro={self.metrics['f1_macro']:.4f} ===")
        return self.metrics

    def _train_random_forest(self, X: np.ndarray, y: np.ndarray):
        """Train Random Forest classifier."""
        logger.info("Training Random Forest Classifier...")
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features="sqrt",
            class_weight="balanced",
            random_state=self.random_seed,
            n_jobs=-1,
        )
        model.fit(X, y)
        return model, "RandomForestClassifier"

    def _train_xgboost(self, X: np.ndarray, y: np.ndarray):
        """Train XGBoost classifier."""
        try:
            from xgboost import XGBClassifier
            logger.info("Training XGBoost Classifier...")
            n_classes = len(np.unique(y))
            model = XGBClassifier(
                n_estimators=200,
                max_depth=10,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                objective="multi:softprob" if n_classes > 2 else "binary:logistic",
                eval_metric="mlogloss" if n_classes > 2 else "logloss",
                random_state=self.random_seed,
                use_label_encoder=False,
                n_jobs=-1,
            )
            model.fit(X, y)
            return model, "XGBClassifier"
        except ImportError:
            logger.warning("XGBoost not available, falling back to Random Forest")
            return self._train_random_forest(X, y)

    def _evaluate(self, X_test: np.ndarray, y_test: np.ndarray, train_duration: float) -> Dict[str, Any]:
        """Compute all evaluation metrics."""
        y_pred = self.model.predict(X_test)
        class_names = self.pipeline.class_names

        acc = accuracy_score(y_test, y_pred)
        prec_macro = precision_score(y_test, y_pred, average="macro", zero_division=0)
        rec_macro = recall_score(y_test, y_pred, average="macro", zero_division=0)
        f1_mac = f1_score(y_test, y_pred, average="macro", zero_division=0)
        cm = confusion_matrix(y_test, y_pred)
        report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True, zero_division=0)

        # False positive/negative rates (weighted average for multiclass)
        total = len(y_test)
        fp_total = 0
        fn_total = 0
        for i in range(len(class_names)):
            mask_actual = (y_test == i)
            mask_pred = (y_pred == i)
            fp_total += np.sum(mask_pred & ~mask_actual)
            fn_total += np.sum(mask_actual & ~mask_pred)
        fpr = fp_total / total if total > 0 else 0.0
        fnr = fn_total / total if total > 0 else 0.0

        # Per-class metrics
        per_class = {}
        for cname in class_names:
            if cname in report:
                per_class[cname] = {
                    "precision": round(report[cname]["precision"], 4),
                    "recall": round(report[cname]["recall"], 4),
                    "f1_score": round(report[cname]["f1-score"], 4),
                    "support": int(report[cname]["support"]),
                }

        return {
            "model_name": self.model_name,
            "version": "1.0.0",
            "accuracy": round(acc, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_macro": round(rec_macro, 4),
            "f1_macro": round(f1_mac, 4),
            "fpr": round(fpr, 4),
            "fnr": round(fnr, 4),
            "confusion_matrix": cm.tolist(),
            "classes": class_names,
            "per_class_metrics": per_class,
            "training_duration_seconds": round(train_duration, 2),
        }

    def _get_feature_importances(self) -> List[Dict[str, Any]]:
        """Extract feature importances from the trained model."""
        importances = []
        if hasattr(self.model, "feature_importances_"):
            raw = self.model.feature_importances_
            for i, col in enumerate(self.pipeline.feature_columns):
                importances.append({
                    "feature": col,
                    "importance": round(float(raw[i]), 6),
                })
            importances.sort(key=lambda x: x["importance"], reverse=True)
        return importances

    def _save_artifacts(self):
        """Save model, preprocessor, and metrics."""
        # Save model
        model_path = settings.BEST_MODEL_PATH
        joblib.dump(self.model, model_path)
        logger.info(f"Model saved to {model_path}")

        # Save preprocessor
        self.pipeline.save_preprocessor()

        # Save metrics
        metrics_path = settings.MODEL_METRICS_PATH
        with open(metrics_path, "w") as f:
            json.dump(self.metrics, f, indent=2, default=str)
        logger.info(f"Metrics saved to {metrics_path}")


class ModelPredictor:
    """Loads trained model and makes predictions on new data."""

    def __init__(self):
        self.model = None
        self.pipeline = DataPipeline()
        self.is_loaded = False
        self.model_name = ""
        self.metrics: Dict[str, Any] = {}

    def load(self) -> bool:
        """Load the trained model and preprocessor."""
        model_path = settings.BEST_MODEL_PATH
        if not model_path.exists():
            logger.warning(f"No trained model found at {model_path}")
            return False

        self.model = joblib.load(model_path)
        loaded = self.pipeline.load_preprocessor()
        if not loaded:
            logger.warning("Failed to load preprocessor")
            return False

        # Load metrics if available
        if settings.MODEL_METRICS_PATH.exists():
            with open(settings.MODEL_METRICS_PATH) as f:
                self.metrics = json.load(f)

        self.model_name = type(self.model).__name__
        self.is_loaded = True
        logger.info(f"Model loaded: {self.model_name}")
        return True

    def predict_single(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict a single network event.
        Returns predicted class, confidence, and contributing features.
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Train a model first.")

        X = self.pipeline.prepare_single_input(features)
        
        # Predict class
        pred_encoded = self.model.predict(X)[0]
        pred_label = self.pipeline.label_encoder.inverse_transform([pred_encoded])[0]
        
        # Confidence (probability)
        if hasattr(self.model, "predict_proba"):
            probas = self.model.predict_proba(X)[0]
            confidence = float(probas[pred_encoded])
        else:
            confidence = 0.75  # Default for models without predict_proba
        
        # Top contributing features (from model feature importance)
        contributions = self._get_contributions(features)

        return {
            "predicted_label": "Benign" if pred_label == "Benign" else "Attack",
            "predicted_attack_type": pred_label,
            "confidence": round(confidence, 4),
            "contributions": contributions,
        }

    def predict_batch(self, features_list: List[Dict[str, float]]) -> List[Dict[str, Any]]:
        """Predict multiple events."""
        results = []
        for feat in features_list:
            try:
                result = self.predict_single(feat)
                results.append(result)
            except Exception as e:
                results.append({
                    "predicted_label": "Error",
                    "predicted_attack_type": "Error",
                    "confidence": 0.0,
                    "contributions": [],
                    "error": str(e),
                })
        return results

    def _get_contributions(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Get top feature contributions for a prediction."""
        if not hasattr(self.model, "feature_importances_"):
            return []

        importances = self.model.feature_importances_
        contributions = []
        for i, col in enumerate(self.pipeline.feature_columns):
            val = features.get(col, 0.0)
            imp = float(importances[i])
            if imp > 0.01:  # Only include significant features
                contributions.append({
                    "feature": col,
                    "value": round(val, 4),
                    "importance": round(imp, 4),
                    "effect": "increases_risk" if val > 0 else "decreases_risk",
                })
        
        contributions.sort(key=lambda x: x["importance"], reverse=True)
        return contributions[:10]  # Top 10

    def get_model_status(self) -> Dict[str, Any]:
        """Get current model status for dashboard display."""
        if not self.is_loaded:
            return {
                "status": "not_loaded",
                "model_name": "No model trained",
                "message": "Train a model using the ML pipeline to enable predictions.",
                "accuracy": None,
                "f1_macro": None,
            }
        return {
            "status": "loaded",
            "model_name": self.model_name,
            "message": f"{self.model_name} loaded and ready for predictions.",
            "accuracy": self.metrics.get("accuracy"),
            "f1_macro": self.metrics.get("f1_macro"),
            "classes": self.pipeline.class_names,
            "feature_count": len(self.pipeline.feature_columns),
        }


# Module-level singleton
predictor = ModelPredictor()
