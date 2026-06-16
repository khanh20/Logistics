* Cách add migration và update migration*
Di chuyển vào thư mục LG.Authentication.Infrastructure (thư mục khác làm tương tự)
# Generate migration từ entity configs
dotnet ef migrations add InitialCreate `
  --startup-project ..\LG.Authentication.API `
  --output-dir Migrations

# Apply lên Neon
dotnet ef database update `--startup-project ..\LG.Authentication.API
# Xoá migration 
dotnet ef migrations remove --startup-project ..\LG.Authentication.API

-----------------------------------------------------------------------------------------
* Để nhận callback từ Zalo Pay về localhost thì dùng ngrok, tải ngrok về và chạy lệnh:
ngrok http https://localhost:7215
Link tải: https://ngrok.com/download/windows
-----------------------------------------------------------------------------------------
* Thẻ ngân hàng kiểm thử 
# Thẻ tín dụng
Số thẻ	Chủ thẻ	Ngày hết hạn	CVV
4111111111111111	NGUYEN VAN A	01/28	123
Thẻ ATM
# Thẻ hợp lệ
TT	Số thẻ	Chủ thẻ	Ngày phát hành
1	9704540000000062	NGUYEN VAN A	10/18
2	9704540000000070	NGUYEN VAN A	10/18
3	9704540000000088	NGUYEN VAN A	10/18
4	9704540000000096	NGUYEN VAN A	10/18
5	9704541000000094	NGUYEN VAN A	10/18
6	9704541000000078	NGUYEN VAN A	10/18
# Thẻ bị mất/đánh cắp
TT	Số thẻ	Chủ thẻ	Ngày phát hành
1	9704540000000013	NGUYEN VAN A	10/18
2	9704540000000021	NGUYEN VAN A	10/18
3	9704541000000029	NGUYEN VAN A	10/18
4	9704541000000052	NGUYEN VAN A	10/18
5	9704541000000060	NGUYEN VAN A	10/18
6	9704541000000086	NGUYEN VAN A	10/18
# Thẻ bị timeout
TT	Số thẻ	Chủ thẻ	Ngày phát hành
1	9704540000000039	NGUYEN VAN A	10/18
2	9704541000000037	NGUYEN VAN A	10/18
3	9704540000000054	NGUYEN VAN A	10/18
# Thẻ hết tiền
TT	Số thẻ	Chủ thẻ	Ngày phát hành
1	9704540000000047	NGUYEN VAN A	10/18
2	9704541000000011	NGUYEN VAN A	10/18
3	9704541000000045	NGUYEN VAN A	10/18