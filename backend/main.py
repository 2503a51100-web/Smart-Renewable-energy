
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from backend.database import Base, engine, get_db
from backend import models

from backend.routers import energy, devices, alerts, auth
from backend.routers.auth import get_current_user

from backend.services.analytics import get_energy_analytics
from backend.services.ai_insights import get_ai_insights


# Create database tables
Base.metadata.create_all(bind=engine)


# Create FastAPI application
app = FastAPI(
    title="Smart Renewable Energy Monitoring Platform",
    description="Monitor solar and wind energy generation with intelligent insights.",
    version="1.0.0"
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routers
app.include_router(devices.router)
app.include_router(energy.router)
app.include_router(alerts.router)
app.include_router(auth.router)


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "Smart Renewable Energy Monitoring Platform is running!",
        "status": "Success"
    }


# Energy Analytics Endpoint
@app.get("/analytics/summary")
def energy_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_energy_analytics(db, current_user)


# AI Insights Endpoint
@app.get("/analytics/ai-insights")
def ai_insights(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_ai_insights(db, current_user)
