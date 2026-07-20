from pydantic import BaseModel
from typing import Optional

class FraudEvaluationRequest(BaseModel):
    customerId: str
    amount: float
    transactionType: str
    customerAgeHours: float
    contextInfo: str
    # --- Enhanced features ---
    totalDepositedEver: float = 0.0          # Tong tien da nap tu truoc den gio (VND)
    recentTopupCount24h: int = 0             # So lan nap trong 24h gan nhat
    recentTopupTotal24h: float = 0.0         # Tong tien nap trong 24h gan nhat (VND)
    averageTopupAmount: float = 0.0          # So tien nap trung binh (VND)
    walletBalance: float = 0.0              # So du vi hien tai (VND)
    hasCompletedOrder: bool = False          # Da tung dat don hang chua
    ipAddress: Optional[str] = None         # IP address nguoi dung (neu co)

class FraudEvaluationResponse(BaseModel):
    IsFraud: bool
    RiskScore: float
    Reason: str
