import csv, statistics as st
from collections import defaultdict
from datetime import date

import sys
PATH = sys.argv[1] if len(sys.argv) > 1 else "transit_dataset.csv"

rows = []
with open(PATH) as f:
    for r in csv.DictReader(f):
        r["transit_days"] = float(r["transit_days"])
        r["weight_kg"] = float(r["weight_kg"])
        r["d"] = date.fromisoformat(r["departure_date"])
        rows.append(r)

days = sorted(r["transit_days"] for r in rows)
n = len(days)
def pct(p): return days[min(n - 1, int(p / 100 * n))]

print(f"== TỔNG QUAN ==")
print(f"n={n}, khoảng ngày gửi: {min(r['d'] for r in rows)} → {max(r['d'] for r in rows)}")
missing = sum(1 for r in rows if not all(r.values()))
print(f"missing values: {missing}")

mean = st.mean(days); sd = st.pstdev(days)
skew = sum((x - mean) ** 3 for x in days) / (n * sd ** 3)
print(f"\n== LABEL transit_days ==")
print(f"mean={mean:.2f}  std={sd:.2f}  min={days[0]}  max={days[-1]}  skewness={skew:.2f}")
print("percentiles: " + "  ".join(f"p{p}={pct(p):.1f}" for p in [5, 25, 50, 75, 90, 95, 99]))
out3 = sum(1 for x in days if x > mean + 3 * sd)
print(f"outlier >mean+3σ ({mean + 3 * sd:.1f} ngày): {out3} dòng ({out3 / n:.1%})")

print("\n== HISTOGRAM (bin 1 ngày) ==")
hist = defaultdict(int)
for x in days: hist[min(int(x), 20)] += 1
mx = max(hist.values())
for b in sorted(hist):
    label = f"{b:>2}-{b+1}" if b < 20 else "20+ "
    print(f"  {label}: {'#' * int(50 * hist[b] / mx):<50} {hist[b]}")

def group(key, title):
    g = defaultdict(list)
    for r in rows: g[r[key]].append(r["transit_days"])
    print(f"\n== {title} ==")
    for k in sorted(g, key=lambda k: st.mean(g[k])):
        v = g[k]
        print(f"  {k:<14} n={len(v):>6}  mean={st.mean(v):5.2f}  median={st.median(v):5.2f}  std={st.pstdev(v):4.2f}")

group("border_crossing", "THEO CỬA KHẨU")
group("origin_province_cn", "THEO TỈNH GỬI")
group("carrier_cn", "THEO CARRIER TQ")
group("season", "THEO MÙA")
group("is_tet_window", "TẾT (1) vs THƯỜNG (0)")
group("congestion_active", "TẮC BIÊN (1) vs THƯỜNG (0)")

print("\n== TƯƠNG TÁC CỬA KHẨU × TẾT (mean) ==")
g = defaultdict(list)
for r in rows: g[(r["border_crossing"], r["is_tet_window"])].append(r["transit_days"])
for b in ["HuuNghi", "LaoCai", "MongCai"]:
    normal, tet = st.mean(g[(b, "0")]), st.mean(g[(b, "1")])
    print(f"  {b:<8} thường={normal:5.2f}  tết={tet:5.2f}  chênh=+{tet - normal:.2f}")

print("\n== CÂN NẶNG ==")
buckets = [(0, 5), (5, 20), (20, 100), (100, 500), (500, 99999)]
for lo, hi in buckets:
    v = [r["transit_days"] for r in rows if lo <= r["weight_kg"] < hi]
    if v: print(f"  {lo:>4}-{hi if hi < 99999 else '∞':<5} kg: n={len(v):>6}  mean={st.mean(v):5.2f}")

print("\n== THEO THÁNG (drift/mùa vụ) ==")
g = defaultdict(list)
for r in rows: g[r["d"].month].append(r["transit_days"])
for m in sorted(g): print(f"  T{m:>2}: mean={st.mean(g[m]):5.2f}  n={len(g[m])}")

print("\n== NGÀY TRONG TUẦN ==")
g = defaultdict(list)
for r in rows: g[r["d"].weekday()].append(r["transit_days"])
names = ["T2","T3","T4","T5","T6","T7","CN"]
for wd in sorted(g): print(f"  {names[wd]}: mean={st.mean(g[wd]):5.2f}")

# Tỉ lệ nhóm hiếm — đủ mẫu để one-hot không?
print("\n== TỈ LỆ NHÓM (kiểm tra đủ mẫu) ==")
for key in ["is_tet_window", "congestion_active"]:
    c = sum(1 for r in rows if r[key] == "1")
    print(f"  {key}=1: {c} ({c / n:.1%})")
