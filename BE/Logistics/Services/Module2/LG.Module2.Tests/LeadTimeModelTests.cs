using LG.Module2.ApplicationServices.Services.Ml;
using Moq;

namespace LG.Module2.Tests;

/// Bước 8 — helper mùa/Tết và bảng conformal (phần logic tách được khỏi model).
public class LeadTimeModelTests
{
    // ── SeasonHelper: cửa sổ Tết âm lịch thật, không phải "cả T1+T2" ─────────────
    [Theory]
    [InlineData("2026-02-17", "tet")]     // mùng 1 Tết 2026
    [InlineData("2026-02-03", "tet")]     // đầu cửa sổ (−14 ngày)
    [InlineData("2026-02-24", "tet")]     // cuối cửa sổ (+7 ngày)
    [InlineData("2026-01-05", "winter")]  // tháng 1 NHƯNG ngoài cửa sổ → winter (khác quy tắc cũ)
    [InlineData("2026-03-01", "spring")]
    [InlineData("2026-07-15", "summer")]
    [InlineData("2026-10-20", "autumn")]
    [InlineData("2026-12-10", "winter")]
    [InlineData("2025-01-20", "tet")]     // Tết 2025 = 29/01 → 20/01 trong cửa sổ
    public void InferSeason_TheoCuaSoTetAmLich(string date, string expected) =>
        Assert.Equal(expected, SeasonHelper.InferSeason(DateTime.Parse(date)));

    // ── ConformalTable: lookup nhóm → fallback cửa khẩu → global ─────────────────
    private static readonly string[] Csv =
    {
        "border,regime,q80",
        "HuuNghi,normal,2.21",
        "HuuNghi,tet,3.18",
        "HuuNghi,*,2.5",
        "LaoCai,*,2.1",
        "*,*,2.8",
    };

    [Fact]
    public void QFor_UuTienNhomChinhXac()
    {
        var t = ConformalTable.Parse(Csv);
        Assert.Equal(2.21, t.QFor("HuuNghi", "normal"));
        Assert.Equal(3.18, t.QFor("HuuNghi", "tet"));
    }

    [Fact]
    public void QFor_FallbackCuaKhau_RoiGlobal()
    {
        var t = ConformalTable.Parse(Csv);
        Assert.Equal(2.1, t.QFor("LaoCai", "tet"));      // không có nhóm tết → mức cửa khẩu
        Assert.Equal(2.8, t.QFor("MongCai", "normal"));  // không có cửa khẩu → global
    }

    [Fact]
    public void Parse_FileRong_NemLoi() =>
        Assert.Throws<InvalidDataException>(() => ConformalTable.Parse(new[] { "border,regime,q80" }));

    // ── Tích hợp thật: nạp leadtime.zip do Trainer xuất + predict ────────────────
    // Tự bỏ qua nếu máy chưa chạy Trainer (artifacts gitignore) — không fail CI.
    [Fact]
    public void ModelThat_NapVaPredict_KhoangHopLy()
    {
        var dir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,
            "../../../../LG.Module2.Trainer/models"));
        if (!File.Exists(Path.Combine(dir, "leadtime.zip"))) return;   // chưa train → bỏ qua

        var config = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
        config.Setup(c => c["Ai:ModelDirectory"]).Returns(dir);
        var svc = new LeadTimeModelService(config.Object,
            Moq.Mock.Of<Microsoft.Extensions.Logging.ILogger<LeadTimeModelService>>());

        var normal = svc.Predict("Quảng Châu", "SF Express",
            LG.Module2.Domain.Entities.BorderCrossing.HuuNghi, 5m, "spring", alertActive: false);
        Assert.NotNull(normal);
        Assert.InRange(normal!.EstDaysMin, 1, 10);
        Assert.True(normal.EstDaysMax > normal.EstDaysMin);
        Assert.Equal(0.80m, normal.ConfidencePct);

        // Có alert tắc biên → dự báo phải dài hơn đáng kể (model học được hiệu ứng alert)
        var alerted = svc.Predict("Quảng Châu", "SF Express",
            LG.Module2.Domain.Entities.BorderCrossing.HuuNghi, 5m, "spring", alertActive: true);
        Assert.NotNull(alerted);
        Assert.True(alerted!.EstDaysMax > normal.EstDaysMax,
            $"alert phải kéo dài dự báo: normal max={normal.EstDaysMax}, alert max={alerted.EstDaysMax}");
    }
}
