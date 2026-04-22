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