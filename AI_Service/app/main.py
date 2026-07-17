from fastapi import FastAPI
from app.api.endpoints import fraud, health

app = FastAPI(title="Logistics AI Service")

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(fraud.router, tags=["Fraud Detection"])
