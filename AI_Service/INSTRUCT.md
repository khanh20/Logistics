# Hướng Dẫn Chạy Dự Án AI Service

Dự án này được xây dựng bằng **FastAPI** và **Python**. Dưới đây là các bước để cài đặt môi trường và khởi chạy server cục bộ.

## Yêu cầu trước khi chạy
- Python 3.8+ đã được cài đặt trên máy.
- Terminal/PowerShell hoặc Command Prompt.

## Các bước thực hiện

### Bước 1: Di chuyển vào thư mục dự án
Mở terminal và trỏ đường dẫn tới thư mục `AI_Service`:
```powershell
cd "F:\New folder\CODE\Đồ án\Logistics\AI_Service"
```

### Bước 2: Tạo và kích hoạt môi trường ảo (Virtual Environment)
Môi trường ảo giúp tách biệt các thư viện của dự án này với các dự án khác trên máy.
```powershell
# Tạo môi trường ảo có tên là venv
python -m venv venv

# Kích hoạt môi trường ảo trên Windows
.\venv\Scripts\activate
```

### Bước 3: Cài đặt các gói phụ thuộc (Dependencies)
Cài đặt các thư viện cần thiết như `fastapi`, `uvicorn`, `openai` từ file `requirements.txt`:
```powershell
pip install -r requirements.txt
```

### Bước 4: Cấu hình biến môi trường
Kiểm tra file `.env` đã có sẵn trong thư mục dự án. Đảm bảo rằng bạn đã có các API key cần thiết (ví dụ: `OPENAI_API_KEY`) hợp lệ trong file này để các chức năng AI hoạt động.

### Bước 5: Khởi chạy Server
Chạy file `run.py` để khởi động server bằng `uvicorn` (server sẽ tự động reload lại mỗi khi có thay đổi code):
```powershell
python run.py
```

## Truy cập ứng dụng
Sau khi server báo chạy thành công, bạn có thể truy cập các đường dẫn sau trên trình duyệt:
- **API Base URL**: `http://localhost:8000`
- **Swagger UI (Tài liệu API)**: `http://localhost:8000/docs`
- **Redoc**: `http://localhost:8000/redoc`
