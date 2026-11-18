"""
FastAPI Application Entry Point.
Medical IoT Cybersecurity Risk Prediction System.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.database.session import engine, SessionLocal, Base
from backend.app.models.entities import Device, Alert, NetworkEvent, ModelArtifact
from backend.app.api.endpoints.routes import router
from backend.app.services.device_service import seed_demo_devices
from backend.app.services.alert_service import seed_demo_alerts
from backend.app.ml.model import predictor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # --- Startup ---
    logger.info("=" * 60)
    logger.info(f"  {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info("  RESEARCH PROTOTYPE - NOT a certified medical security product")
    logger.info("=" * 60)

    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")

    # Seed demo data
    db = SessionLocal()
    try:
        seed_demo_devices(db)
        seed_demo_alerts(db)
    finally:
        db.close()

    # Attempt to load trained model
    if predictor.load():
        logger.info(f"ML Model loaded: {predictor.model_name}")
    else:
        logger.info("No trained model found. Running in demo mode with rule-based classifier.")

    yield

    # --- Shutdown ---
    from backend.app.simulation.engine import simulation_engine
    if simulation_engine.is_running:
        await simulation_engine.stop()
    logger.info("Application shutting down")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "AI-based cybersecurity risk prediction and threat prioritization "
        "for Medical Internet of Things (IoMT) devices. "
        "This is an academic research prototype."
    ),
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router, prefix=settings.API_V1_STR)

# Root redirect
@app.get("/")
def root():
    return {
        "application": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
        "api": settings.API_V1_STR,
        "disclaimer": "Research prototype. Not a certified medical device security product.",
    }
