import json
import logging
from openai import AsyncOpenAI
from app.core.config import settings
from app.models.schemas import FraudEvaluationRequest, FraudEvaluationResponse

logger = logging.getLogger("fraud_service")

class FraudService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY is not set in .env file!")
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def evaluate_transaction(self, req: FraudEvaluationRequest) -> FraudEvaluationResponse:
        if not self.client:
            logger.warning("No OpenAI client available, using heuristic fallback")
            return self._heuristic_fallback(req)

        prompt = f"""
You are a senior fraud analyst for a Logistics company. Analyze the following transaction for fraud risk.

=== TRANSACTION DATA ===
- Transaction type: {req.transactionType}
- Amount: {req.amount:,.0f} VND
- Account age: {req.customerAgeHours:.1f} hours

=== CUSTOMER BEHAVIOR PROFILE ===
- Total deposited ever: {req.totalDepositedEver:,.0f} VND
- Topup count in last 24h: {req.recentTopupCount24h}
- Total topup amount in last 24h: {req.recentTopupTotal24h:,.0f} VND
- Average topup amount: {req.averageTopupAmount:,.0f} VND
- Current wallet balance: {req.walletBalance:,.0f} VND
- Has completed at least one order: {req.hasCompletedOrder}
- Additional context: {req.contextInfo}

=== FRAUD RULES TO EVALUATE ===
1. NEW ACCOUNT + LARGE DEPOSIT: Account < 24h old depositing >= 5,000,000 VND (high risk)
2. VELOCITY ABUSE: More than 5 topup requests in 24h (smurfing / structuring)
3. AMOUNT SPIKE: This deposit is > 3x the customer's average topup amount (unusual behavior)
4. RAPID ACCUMULATION: Total deposited in last 24h >= 50,000,000 VND (money laundering signal)
5. DEPOSIT WITHOUT USAGE: Large total deposits but customer has never placed an order (no legitimate business purpose)
6. DORMANT ACCOUNT SUDDEN ACTIVITY: Account > 30 days old but first deposit activity now with large amount

Return ONLY valid JSON:
{{
  "RiskScore": (0-100, >=80 means fraud),
  "IsFraud": (true if RiskScore >= 80),
  "Reason": "(Explanation in Vietnamese, mention which rules triggered)"
}}
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a fraud detection AI. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from OpenAI")

            result_dict = json.loads(content)
            
            result = FraudEvaluationResponse(
                IsFraud=bool(result_dict.get("IsFraud", False)),
                RiskScore=float(result_dict.get("RiskScore", 0.0)),
                Reason=str(result_dict.get("Reason", "Unknown"))
            )
            logger.info("OpenAI fraud eval: RiskScore=%.1f, IsFraud=%s", result.RiskScore, result.IsFraud)
            return result

        except Exception as e:
            logger.error("OpenAI API Error: %s", str(e))
            return self._heuristic_fallback(req)

    def _heuristic_fallback(self, req: FraudEvaluationRequest) -> FraudEvaluationResponse:
        """
        Rule-based fallback when OpenAI is unavailable.
        Evaluates multiple fraud signals and accumulates a risk score.
        """
        score = 0.0
        reasons = []

        # Rule 1: New account + large deposit
        if req.customerAgeHours < 24 and req.amount >= 5_000_000:
            score += 40
            reasons.append(
                f"Tai khoan moi ({req.customerAgeHours:.1f}h) nap {req.amount:,.0f} VND"
            )

        # Rule 2: Velocity abuse - too many topups in 24h
        if req.recentTopupCount24h >= 5:
            score += 25
            reasons.append(
                f"Nap tien {req.recentTopupCount24h} lan trong 24h (nghi ngo chia nho giao dich)"
            )

        # Rule 3: Amount spike - deposit >> average
        if req.averageTopupAmount > 0 and req.amount > req.averageTopupAmount * 3:
            score += 20
            reasons.append(
                f"So tien nap ({req.amount:,.0f}) gap {req.amount / req.averageTopupAmount:.1f}x trung binh ({req.averageTopupAmount:,.0f})"
            )

        # Rule 4: Rapid accumulation in 24h
        if req.recentTopupTotal24h + req.amount >= 50_000_000:
            score += 30
            reasons.append(
                f"Tong nap 24h dat {req.recentTopupTotal24h + req.amount:,.0f} VND (>= 50 trieu)"
            )

        # Rule 5: Large deposits but never ordered
        if req.totalDepositedEver >= 10_000_000 and not req.hasCompletedOrder:
            score += 15
            reasons.append(
                f"Da nap tong {req.totalDepositedEver:,.0f} VND nhung chua dat don hang nao"
            )

        # Rule 6: Single very large deposit
        if req.amount >= 20_000_000:
            score += 15
            reasons.append(f"Giao dich don le rat lon: {req.amount:,.0f} VND")

        # Cap score at 100
        score = min(score, 100.0)

        if not reasons:
            reasons.append("Giao dich binh thuong, khong phat hien dau hieu bat thuong")

        final_reason = " | ".join(reasons) + f" [Tong diem: {score:.0f}]"
        is_fraud = score >= 80

        logger.info("Heuristic fallback: score=%.1f, is_fraud=%s", score, is_fraud)

        return FraudEvaluationResponse(
            IsFraud=is_fraud,
            RiskScore=score,
            Reason=final_reason
        )
