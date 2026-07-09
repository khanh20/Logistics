# Bước 2 — đo baseline heuristic Phase 8 (AIForecastService.ForecastTransitAsync)
# trên TẬP TEST theo time-split của LeadTime.md (test = departure_date >= 2026-04-01).
# Đây là mốc MAE/coverage mà model ML (Bước 4-7) phải vượt qua.
#
# Chạy: python3 baseline.py data/transit_50k.csv

import csv, statistics as st, sys
from collections import defaultdict
from datetime import date

PATH = sys.argv[1] if len(sys.argv) > 1 else "data/transit_50k.csv"
TEST_FROM = date(2026, 4, 1)   # khớp Bước 3: train <2026, calib Q1/2026, test >=Q2/2026

# ── Tái lập heuristic (khớp từng dòng AIForecastService.cs) ─────────────────────
BASELINE = {"HuuNghi": (3, 5), "LaoCai": (4, 6), "MongCai": (4, 7)}

def heuristic(border, season, weight_kg, alert_active, alert_delay=2):
    lo, hi = BASELINE.get(border, (4, 7))
    if season == "tet":      lo += 3; hi += 5
    elif season == "winter": lo += 1; hi += 1
    if weight_kg >= 500:     hi += 1
    if alert_active:         lo += alert_delay; hi += alert_delay
    return lo, hi

# ── Load test set ────────────────────────────────────────────────────────────────
rows = []
with open(PATH) as f:
    for r in csv.DictReader(f):
        if date.fromisoformat(r["departure_date"]) >= TEST_FROM:
            rows.append(r)

def evaluate(name, use_alert):
    err, widths, covered = [], [], 0
    by_border = defaultdict(lambda: {"err": [], "cov": 0, "n": 0})
    by_tet    = defaultdict(lambda: {"err": [], "cov": 0, "n": 0})

    for r in rows:
        actual = float(r["transit_days"])
        alert  = use_alert and r["congestion_active"] == "1"
        lo, hi = heuristic(r["border_crossing"], r["season"], float(r["weight_kg"]), alert)
        point  = (lo + hi) / 2

        e = abs(point - actual)
        err.append(e)
        widths.append(hi - lo)
        inside = lo <= actual <= hi
        if inside: covered += 1

        b = by_border[r["border_crossing"]]
        b["err"].append(e); b["n"] += 1; b["cov"] += inside
        t = by_tet[r["is_tet_window"]]
        t["err"].append(e); t["n"] += 1; t["cov"] += inside

    n = len(rows)
    bias = st.mean((float(r["transit_days"]) -
                    sum(heuristic(r["border_crossing"], r["season"], float(r["weight_kg"]),
                                  use_alert and r["congestion_active"] == "1")) / 2)
                   for r in rows)
    print(f"\n== {name} ==")
    print(f"  MAE={st.mean(err):.3f} ngày   bias(actual−pred)={bias:+.3f}   "
          f"PICP={covered / n:.1%} (khoảng phủ thực tế)   width TB={st.mean(widths):.2f} ngày")
    for k in sorted(by_border):
        b = by_border[k]
        print(f"    {k:<8} MAE={st.mean(b['err']):.3f}  PICP={b['cov'] / b['n']:.1%}  n={b['n']}")
    for k, label in [("0", "thường"), ("1", "tết   ")]:
        t = by_tet[k]
        if t["n"]:
            print(f"    {label}   MAE={st.mean(t['err']):.3f}  PICP={t['cov'] / t['n']:.1%}  n={t['n']}")

print(f"Test set: {len(rows)} dòng (departure >= {TEST_FROM})")
dmin = min(r["departure_date"] for r in rows); dmax = max(r["departure_date"] for r in rows)
print(f"Khoảng ngày: {dmin} → {dmax}")

# V1: vận hành thực tế — KHÔNG biết trước tắc biên (không có alert)
evaluate("V1 — heuristic KHÔNG có border alert (thực tế khi hệ thống alert chưa bắt kịp)", use_alert=False)

# V2: giả định hệ thống alert hoàn hảo — biết đúng lúc tắc (delay mặc định +2)
evaluate("V2 — heuristic CÓ alert hoàn hảo (upper bound của heuristic, delay=+2)", use_alert=True)
