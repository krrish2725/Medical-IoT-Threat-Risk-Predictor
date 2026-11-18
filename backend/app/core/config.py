"""
Core application settings and configuration for the Medical IoMT Cybersecurity Risk Prediction System.
"""
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models" / "saved"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medical IoT Cybersecurity Risk Prediction System"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Security
    ENV: str = "development"
    DEBUG: bool = True
    ALLOWED_HOSTS: List[str] = ["*"]
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'medical_iomt_security.db'}"
    
    # File storage paths
    RAW_DATA_DIR: Path = DATA_DIR / "raw"
    PROCESSED_DATA_DIR: Path = DATA_DIR / "processed"
    SAMPLE_DATA_DIR: Path = DATA_DIR / "sample"
    MODELS_SAVE_DIR: Path = MODELS_DIR
    
    # ML Models artifact paths
    BEST_MODEL_PATH: Path = MODELS_DIR / "best_model.joblib"
    PREPROCESSOR_PATH: Path = MODELS_DIR / "preprocessor.joblib"
    MODEL_METRICS_PATH: Path = MODELS_DIR / "model_metrics.json"
    
    # Risk Engine Default Parameters
    # Risk Score = (Likelihood * Impact / 25) * 100
    RISK_THRESHOLD_LOW: float = 24.0
    RISK_THRESHOLD_MEDIUM: float = 49.0
    RISK_THRESHOLD_HIGH: float = 74.0
    RISK_THRESHOLD_CRITICAL: float = 100.0
    
    # Demo and Simulation
    DEMO_MODE: bool = True
    SIMULATION_INTERVAL_SECONDS: float = 3.0
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure directories exist
settings.RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_SAVE_DIR.mkdir(parents=True, exist_ok=True)
