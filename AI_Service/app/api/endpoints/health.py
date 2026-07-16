from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Microservice is running (Clean Architecture)"}
