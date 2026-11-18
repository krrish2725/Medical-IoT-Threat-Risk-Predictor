"""
ML Data Pipeline - Loading, preprocessing, and feature engineering for CICIoMT2024 dataset.

Supports:
- Real CICIoMT2024 CSV files
- Synthetic sample data for demo mode
- Configurable feature selection
- Stratified train/test splitting
"""
import json
import logging
from pathlib import Path
from typing import Tuple, List, Optional, Dict, Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# CICIoMT2024 expected feature columns (numeric flow features)
EXPECTED_FEATURES = [
    "flow_duration", "Header_Length", "Rate", "Srate", "Drate",
    "fin_flag_number", "syn_flag_number", "rst_flag_number",
    "psh_flag_number", "ack_flag_number", "ece_flag_number",
    "cwr_flag_number", "ack_count", "syn_count", "fin_count",
    "urg_count", "rst_count", "HTTP", "HTTPS", "DNS", "Telnet",
    "SMTP", "SSH", "IRC", "TCP", "UDP", "DHCP", "ARP", "ICMP",
    "IPv", "LLC", "Tot sum", "Min", "Max", "AVG", "Std",
    "Tot size", "IAT", "Number", "Magnitue", "Radius",
    "Covariance", "Variance", "Weight",
]

# Columns to drop (identifiers, timestamps, target leakage)
DROP_COLUMNS = [
    "Unnamed: 0", "Flow ID", "Src IP", "Src Port",
    "Dst IP", "Dst Port", "Timestamp", "Protocol",
    "Label",  # Binary label (keep attack_type as target)
]

# Label column names in CICIoMT2024
LABEL_COLUMN_CANDIDATES = ["label", "Label", "Attack_Type", "attack_type", "Sub_Category"]
TARGET_COLUMN = "label"  # Our unified target column name


class DataPipeline:
    """Handles data loading, cleaning, feature selection, and train/test splitting."""

    def __init__(self, random_seed: int = 42):
        self.random_seed = random_seed
        self.scaler: Optional[StandardScaler] = None
        self.label_encoder: Optional[LabelEncoder] = None
        self.feature_columns: List[str] = []
        self.class_names: List[str] = []

    def load_dataset(self, file_path: Optional[str] = None) -> pd.DataFrame:
        """
        Load the CICIoMT2024 dataset from CSV or generate synthetic data.
        
        Args:
            file_path: Path to CSV file. If None, checks default locations.
        
        Returns:
            DataFrame with detected label column renamed to 'label'.
        """
        if file_path and Path(file_path).exists():
            logger.info(f"Loading dataset from {file_path}")
            df = pd.read_csv(file_path, low_memory=False)
        else:
            # Check default data directory
            raw_dir = settings.RAW_DATA_DIR
            csv_files = list(raw_dir.glob("*.csv"))
            if csv_files:
                logger.info(f"Found {len(csv_files)} CSV files in {raw_dir}")
                dfs = []
                for f in csv_files:
                    logger.info(f"  Loading {f.name}...")
                    dfs.append(pd.read_csv(f, low_memory=False))
                df = pd.concat(dfs, ignore_index=True)
            else:
                logger.warning("No real dataset found. Generating synthetic data for demo.")
                from backend.app.ml.sample_data import generate_sample_dataset
                sample_path = str(settings.SAMPLE_DATA_DIR / "synthetic_iomt_dataset.csv")
                df = generate_sample_dataset(n_samples=5000, seed=self.random_seed, save_path=sample_path)
                logger.info(f"Generated synthetic dataset with {len(df)} samples at {sample_path}")

        # Detect and unify label column
        df = self._unify_label_column(df)
        
        logger.info(f"Dataset shape: {df.shape}")
        logger.info(f"Class distribution:\n{df[TARGET_COLUMN].value_counts()}")
        return df

    def _unify_label_column(self, df: pd.DataFrame) -> pd.DataFrame:
        """Find the label/target column and rename it to 'label'."""
        for col in LABEL_COLUMN_CANDIDATES:
            if col in df.columns:
                if col != TARGET_COLUMN:
                    df = df.rename(columns={col: TARGET_COLUMN})
                return df
        
        raise ValueError(
            f"No label column found. Expected one of: {LABEL_COLUMN_CANDIDATES}. "
            f"Available columns: {list(df.columns)}"
        )

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean dataset: handle missing values, infinities, duplicates.
        """
        initial_rows = len(df)

        # Drop known non-feature columns
        cols_to_drop = [c for c in DROP_COLUMNS if c in df.columns and c != TARGET_COLUMN]
        df = df.drop(columns=cols_to_drop, errors="ignore")

        # Remove duplicate rows
        df = df.drop_duplicates()
        logger.info(f"Removed {initial_rows - len(df)} duplicate rows")

        # Replace inf with NaN, then fill NaN with 0
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # For numeric columns, fill NaN with median (safer than mean for skewed network data)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())
        
        # Drop rows where label is missing
        df = df.dropna(subset=[TARGET_COLUMN])
        
        logger.info(f"Cleaned dataset: {len(df)} rows, {len(df.columns)} columns")
        return df

    def select_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Select numeric features and separate from target.
        Avoids target leakage by only using flow-level numeric features.
        """
        y = df[TARGET_COLUMN].copy()

        # Keep only numeric columns as features (exclude target, is_synthetic flags)
        exclude = {TARGET_COLUMN, "is_synthetic", "label", "Label", "Attack_Type"}
        feature_cols = [
            c for c in df.columns
            if c not in exclude and df[c].dtype in [np.float64, np.int64, np.float32, np.int32, float, int]
        ]

        X = df[feature_cols].copy()
        self.feature_columns = list(X.columns)
        
        logger.info(f"Selected {len(self.feature_columns)} features")
        return X, y

    def preprocess(
        self, 
        X_train: pd.DataFrame, 
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        fit_scaler: bool = True
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Scale features and encode labels.
        IMPORTANT: Fit transformations ONLY on training data.
        """
        # Fit label encoder on all known classes
        all_labels = pd.concat([y_train, y_test]).unique()
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(all_labels)
        self.class_names = list(self.label_encoder.classes_)

        y_train_enc = self.label_encoder.transform(y_train)
        y_test_enc = self.label_encoder.transform(y_test)

        # Scale features - fit only on training data
        if fit_scaler:
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
        else:
            X_train_scaled = self.scaler.transform(X_train)
        
        X_test_scaled = self.scaler.transform(X_test)

        logger.info(f"Preprocessing complete. Classes: {self.class_names}")
        return X_train_scaled, X_test_scaled, y_train_enc, y_test_enc

    def split_data(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2,
        stratify: bool = True
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """Stratified train/test split with reproducible seed."""
        stratify_col = y if stratify else None
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=self.random_seed,
            stratify=stratify_col,
        )
        
        logger.info(f"Split: train={len(X_train)}, test={len(X_test)}")
        return X_train, X_test, y_train, y_test

    def save_preprocessor(self, path: Optional[str] = None):
        """Save scaler and label encoder for inference."""
        save_path = Path(path) if path else settings.PREPROCESSOR_PATH
        artifacts = {
            "scaler": self.scaler,
            "label_encoder": self.label_encoder,
            "feature_columns": self.feature_columns,
            "class_names": self.class_names,
        }
        joblib.dump(artifacts, save_path)
        logger.info(f"Preprocessor saved to {save_path}")

    def load_preprocessor(self, path: Optional[str] = None) -> bool:
        """Load saved preprocessor artifacts."""
        load_path = Path(path) if path else settings.PREPROCESSOR_PATH
        if not load_path.exists():
            logger.warning(f"Preprocessor not found at {load_path}")
            return False

        artifacts = joblib.load(load_path)
        self.scaler = artifacts["scaler"]
        self.label_encoder = artifacts["label_encoder"]
        self.feature_columns = artifacts["feature_columns"]
        self.class_names = artifacts["class_names"]
        logger.info(f"Preprocessor loaded from {load_path}")
        return True

    def prepare_single_input(self, features: Dict[str, float]) -> np.ndarray:
        """
        Prepare a single event's features for inference.
        Maps input features to the trained feature order and scales.
        """
        if self.scaler is None or not self.feature_columns:
            raise RuntimeError("Preprocessor not loaded. Train a model first or load preprocessor.")

        # Build feature vector in the correct order
        feature_vector = []
        for col in self.feature_columns:
            feature_vector.append(features.get(col, 0.0))

        arr = np.array([feature_vector], dtype=np.float64)
        arr = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)
        return self.scaler.transform(arr)
