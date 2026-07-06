import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

from dotenv import load_dotenv

# Tải biến môi trường từ file .env (nếu có)
load_dotenv()

app = FastAPI(title="Logistics AI Service")

# Pydantic models for request/response
class FraudEvaluationRequest(BaseModel):
    customerId: str
    amount: float
    transactionType: str
    customerAgeHours: float
    contextInfo: str

class FraudEvaluationResponse(BaseModel):
    IsFraud: bool
    RiskScore: float
    Reason: str

# Khởi tạo OpenAI client. API Key được lấy từ biến môi trường (ENV) qua file .env
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    print("WARNING: OPENAI_API_KEY chưa được thiết lập trong file .env!")
    
client = AsyncOpenAI(api_key=API_KEY)

@app.post("/evaluate-fraud", response_model=FraudEvaluationResponse)
async def evaluate_fraud(req: FraudEvaluationRequest):
    try:
        prompt = f"""
Bạn là một chuyên gia phòng chống rửa tiền và gian lận tài chính (Fraud Analyst) của một công ty Logistics.
Thông tin giao dịch:
- Loại giao dịch: {req.transactionType}
- Số tiền: {req.amount} VNĐ
- Giờ hoạt động của tài khoản: {req.customerAgeHours:.1f} giờ
- Thông tin thêm: {req.contextInfo}

Hãy đánh giá rủi ro gian lận của giao dịch này (như nạp thẻ ăn cắp, rửa tiền, bất thường).
Trả về KẾT QUẢ ĐÚNG FORMAT JSON sau (không chứa markdown, chỉ trả về JSON hợp lệ):
{{
  "RiskScore": (từ 0 đến 100, >80 là rủi ro cao),
  "IsFraud": (true nếu RiskScore >= 80, ngược lại false),
  "Reason": "(Giải thích lý do ngắn gọn vì sao rủi ro cao hoặc thấp)"
}}
"""

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You must strictly return JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={ "type": "json_object" } # Ép buộc model trả về JSON hợp lệ
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")

        # Phân tích cú pháp JSON
        result_dict = json.loads(content)
        
        return FraudEvaluationResponse(
            IsFraud=bool(result_dict.get("IsFraud", False)),
            RiskScore=float(result_dict.get("RiskScore", 0.0)),
            Reason=str(result_dict.get("Reason", "Unknown"))
        )

    except Exception as e:
        # Xử lý lỗi và fallback heuristic nếu OpenAI lỗi
        print(f"Lỗi OpenAI: {e}")
        
        fallback_score = 10.0
        fallback_reason = "Giao dịch bình thường (Fallback)."
        
        if req.customerAgeHours < 24 and req.amount > 20000000:
            fallback_score = 85.0
            fallback_reason = "Tài khoản quá mới nhưng nạp số tiền lớn. Nghi ngờ rửa tiền (Fallback)."
            
        return FraudEvaluationResponse(
            IsFraud=fallback_score >= 80,
            RiskScore=fallback_score,
            Reason=fallback_reason
        )

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Microservice is running"}

if __name__ == "__main__":
    import uvicorn
    # Chạy server ở cổng 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
