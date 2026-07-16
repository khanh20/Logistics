from fastapi import APIRouter
from app.models.schemas import FraudEvaluationRequest, FraudEvaluationResponse
from app.services.fraud_service import FraudService

router = APIRouter()
fraud_service = FraudService()

@router.post("/evaluate-fraud", response_model=FraudEvaluationResponse)
async def evaluate_fraud(req: FraudEvaluationRequest):
    return await fraud_service.evaluate_transaction(req)
