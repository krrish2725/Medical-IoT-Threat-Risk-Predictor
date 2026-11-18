# Medical IoMT Cybersecurity Risk Prediction System

> **Academic Research Prototype** — This is not a certified or clinically validated medical security product.
> Risk scores and threat predictions are research demonstrations only.

An end-to-end AI/ML application that detects and classifies cybersecurity threats affecting Medical Internet of Things (IoMT) devices, calculates risk scores, and displays results on an interactive security dashboard.

---

## Features

| Feature | Description |
|---|---|
| **Threat Detection** | ML-based classification: DDoS, DoS, Spoofing, MQTT Attacks, Recon, Benign |
| **Risk Scoring** | Formula: `Score = (Likelihood × Impact / 25) × 100`, range 0–100 |
| **Device Management** | Track ICU monitors, infusion pumps, wearables, and other IoMT devices |
| **Alert Management** | Status tracking: new → investigating → resolved / false_positive |
| **What-If Analysis** | Simulate hypothetical risk scenarios |
| **Model Performance** | Real evaluation metrics after training (accuracy, F1, confusion matrix) |
| **Batch Predictions** | Upload CSV, get predictions for up to 10,000 rows |
| **Live Simulation** | Synthetic event generator for dashboard demonstrations |
| **Demo Mode** | Fully functional with synthetic data when no dataset is available |

---

## Technology Stack

**Backend:** Python · FastAPI · SQLAlchemy · SQLite · Uvicorn
**ML:** scikit-learn (Random Forest) · XGBoost · SHAP · pandas · NumPy
**Frontend:** React · TypeScript · Vite · Tailwind CSS v4 · Recharts · Lucide

---

## Quick Start (Windows PowerShell)

### 1. Install Python dependencies

```powershell
pip install -r requirements.txt
```

### 2. Start the backend

```powershell
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### 3. Start the frontend (new PowerShell window)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Dataset Setup (CICIoMT2024)

The system works in **demo mode with synthetic data** by default.
To train on the real dataset:

1. Download from: https://www.unb.ca/cic/datasets/iomt-dataset-2024.html
2. Place CSV files in the `data/raw/` directory
3. Train the model via the dashboard **Model Performance** page, or:

```powershell
# Train from PowerShell
python -m backend.app.ml.model
```

The trained model is saved to `models/saved/`. The backend automatically loads it on next startup.

---

## Project Structure

```
aiml/
├── backend/
│   └── app/
│       ├── api/endpoints/routes.py    # All REST API endpoints
│       ├── core/config.py             # Configuration settings
│       ├── database/session.py        # SQLAlchemy setup
│       ├── models/entities.py         # ORM models
│       ├── schemas/schemas.py         # Pydantic schemas
│       ├── services/                  # Business logic layer
│       ├── ml/
│       │   ├── model.py               # ModelTrainer + ModelPredictor
│       │   ├── data_pipeline.py       # Data loading & preprocessing
│       │   └── sample_data.py         # Synthetic data generator
│       ├── risk/scoring.py            # Risk scoring engine
│       ├── simulation/engine.py       # Live simulation engine
│       └── main.py                    # FastAPI app entry point
├── frontend/
│   └── src/
│       ├── pages/                     # Dashboard, Devices, Alerts, etc.
│       ├── components/                # Sidebar, StatCard, RiskBadge
│       ├── services/api.ts            # API client
│       └── types/index.ts             # TypeScript interfaces
├── data/raw/                          # Place CICIoMT2024 CSVs here
├── models/saved/                      # Trained model artifacts (auto-created)
├── backend/tests/test_core.py         # pytest test suite
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/dashboard/summary` | Dashboard statistics |
| GET/POST | `/api/devices` | List / create devices |
| PATCH | `/api/devices/{id}` | Update device |
| POST | `/api/predict` | Single-event prediction |
| POST | `/api/predict/batch` | CSV batch prediction |
| GET | `/api/alerts` | List alerts (filter by status/severity) |
| PATCH | `/api/alerts/{id}` | Update alert status |
| GET | `/api/model/metrics` | Model evaluation metrics |
| POST | `/api/model/train` | Trigger model training |
| POST | `/api/risk/what-if` | What-if risk scenario |
| POST/POST | `/api/simulation/start` `/stop` | Control simulation |
| GET | `/api/reports/summary` | Full report |
| GET | `/api/reports/export` | Download CSV report |

Full interactive docs: `http://localhost:8000/docs`

---

## Running Tests

```powershell
python -m pytest backend/tests/test_core.py -v
```

**Results:** 23 tests — risk scoring, sample data, and data pipeline.

---

## Risk Scoring

```
Risk Score = (Likelihood × Impact / 25) × 100

Likelihood: 1–5 (based on model confidence + attack type)
Impact:     1–5 (based on device criticality + threat severity)

Categories:
  0–24:   Low
  25–49:  Medium
  50–74:  High
  75–100: Critical
```

Device risk aggregation: `0.70 × max_score + 0.30 × mean_score`

---

## Disclaimer

- This system is an **academic research prototype**, not a certified medical device security product.
- Risk scores are based on configurable heuristics and ML predictions. They are not authoritative.
- The CICIoMT2024 dataset is from the University of New Brunswick (UNB). Check their licensing terms before use.
- All synthetic device profiles and hospital department names are fictitious demonstration data.
- **Do not use this system for clinical decision-making.**
