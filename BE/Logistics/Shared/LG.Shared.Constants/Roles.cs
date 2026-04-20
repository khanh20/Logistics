namespace LG.Shared.Constants;

public static class Roles
{
    public const string Admin      = "Admin";
    public const string NvMuaHang  = "NV_MuaHang";
    public const string NvKho      = "NV_Kho";
    public const string KeToan     = "KeToan";
    public const string NvCskh     = "NV_CSKH";
    public const string KhachHang  = "KhachHang";   // default customer role

    // Scope groupings
    public static readonly IReadOnlySet<string> StaffRoles = new HashSet<string>
    {
        Admin, NvMuaHang, NvKho, KeToan, NvCskh
    };

    public static readonly IReadOnlySet<string> CustomerRoles = new HashSet<string>
    {
        KhachHang
    };
}
