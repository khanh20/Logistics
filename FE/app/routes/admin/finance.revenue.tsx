import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { financeApi } from "~/lib/api/finance";
import type { DailyRevenueReport } from "~/lib/types/finance";
import { PiChartBarBold, PiChartLineUpBold, PiMoneyBold, PiClockClockwiseBold, PiArrowLeftBold } from "react-icons/pi";

export default function AdminFinanceRevenue() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<DailyRevenueReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Default range: last 7 days
  const [dateRange, setDateRange] = useState({
    from: dayjs().subtract(7, "day").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD")
  });
  
  const [generateDate, setGenerateDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchRange = async () => {
    setIsLoading(true);
    try {
      const res = await financeApi.getDailyRevenueRange(dateRange.from, dateRange.to);
      if (res.success && res.data) {
        setReports(res.data);
      } else {
        toast.error(res.message || "Failed to fetch revenue data");
      }
    } catch (error: unknown) {
      toast.error("Error fetching revenue data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRange();
  }, [dateRange]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await financeApi.generateDailyRevenue(generateDate);
      if (res.success) {
        toast.success(`Generated revenue for ${generateDate}`);
        fetchRange(); // Refresh the list
      } else {
        toast.error(res.message || "Failed to generate revenue");
      }
    } catch (error: unknown) {
      toast.error("Error generating revenue");
    } finally {
      setIsGenerating(false);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    return reports.map(r => ({
      name: dayjs(r.reportDate).format("DD/MM"),
      totalRevenue: r.totalRevenueVnd,
      serviceFee: r.serviceFeeRevenueVnd,
      shippingFee: r.shipFeeRevenueVnd,
      inspectionFee: r.inspectionFeeRevenueVnd,
      insuranceFee: r.insuranceFeeRevenueVnd,
      penaltyFee: r.penaltyRevenueVnd,
      entrustmentFee: r.entrustmentFeeRevenueVnd || 0,
      collectedOnBehalf: r.totalCollectedOnBehalfVnd || 0,
      exchangeProfit: r.exchangeProfitLossVnd || 0,
      orders: r.totalOrdersCompleted
    }));
  }, [reports]);

  const kpiData = useMemo(() => {
    return reports.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalRevenueVnd,
      totalOrders: acc.totalOrders + curr.totalOrdersCompleted,
      totalService: acc.totalService + curr.serviceFeeRevenueVnd,
      totalEntrustment: acc.totalEntrustment + (curr.entrustmentFeeRevenueVnd || 0),
      totalCollected: acc.totalCollected + (curr.totalCollectedOnBehalfVnd || 0),
      totalExchange: acc.totalExchange + (curr.exchangeProfitLossVnd || 0)
    }), { totalRevenue: 0, totalOrders: 0, totalService: 0, totalEntrustment: 0, totalCollected: 0, totalExchange: 0 });
  }, [reports]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors mb-4"
        >
          <PiArrowLeftBold />
          Quay lại
        </button>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Báo cáo doanh thu</h1>
          <p className="text-sm text-gray-500">Phân tích lợi nhuận và doanh thu theo ngày</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-[#EAEAEA] shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium mb-1">Tính lại doanh thu ngày:</span>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={generateDate}
                onChange={(e) => setGenerateDate(e.target.value)}
                className="text-sm border border-[#EAEAEA] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-black hover:bg-neutral-800 disabled:bg-gray-300 text-white text-sm font-semibold py-1.5 px-4 rounded-md transition-colors flex items-center gap-2"
              >
                {isGenerating ? "Đang xử lý..." : "Chốt số liệu"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Xem từ:</span>
        <input 
          type="date" 
          value={dateRange.from}
          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          className="text-sm border border-[#EAEAEA] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black bg-white"
        />
        <span className="text-sm font-medium text-gray-700">đến:</span>
        <input 
          type="date" 
          value={dateRange.to}
          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          className="text-sm border border-[#EAEAEA] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black bg-white"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white border border-[#EAEAEA] rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Tổng Doanh Thu</p>
              <h3 className="text-xl font-serif font-bold text-black">{kpiData.totalRevenue.toLocaleString()} ₫</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Phí Dịch Vụ Mua Hộ</p>
              <h3 className="text-xl font-serif font-bold text-black">{kpiData.totalService.toLocaleString()} ₫</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Phí Ủy Thác Nhập Khẩu</p>
              <h3 className="text-xl font-serif font-bold text-black">{kpiData.totalEntrustment.toLocaleString()} ₫</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Tiền Thu Hộ (VAT+Nhập Khẩu)</p>
              <h3 className="text-xl font-serif font-bold text-black">{kpiData.totalCollected.toLocaleString()} ₫</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Chênh Lệch Tỷ Giá</p>
              <h3 className="text-xl font-serif font-bold text-black">{kpiData.totalExchange.toLocaleString()} ₫</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Tổng Đơn Hàng</p>
              <h3 className="text-xl font-serif font-bold text-black">{kpiData.totalOrders.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Chart */}
          <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm p-6">
            <h3 className="text-base font-semibold text-black mb-6 flex items-center gap-2">
              <PiChartLineUpBold className="text-lg text-indigo-500" /> Xu hướng Tổng Doanh Thu
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #EAEAEA', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => [`${value.toLocaleString()} ₫`, "Tổng Doanh Thu"]}
                  />
                  <Line type="monotone" dataKey="totalRevenue" stroke="#000000" strokeWidth={3} dot={{ r: 4, fill: '#000000', strokeWidth: 2, stroke: '#FFFFFF' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Chart */}
          <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm p-6">
            <h3 className="text-base font-semibold text-black mb-6 flex items-center gap-2">
              <PiChartBarBold className="text-lg text-emerald-500" /> Cấu trúc Doanh Thu Phí
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #EAEAEA', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any, name: any) => {
                      const labels: any = {
                        serviceFee: "Phí dịch vụ",
                        shippingFee: "Phí vận chuyển",
                        inspectionFee: "Phí kiểm đếm",
                        insuranceFee: "Phí bảo hiểm",
                        entrustmentFee: "Phí ủy thác Nhập Khẩu",
                        exchangeProfit: "Chênh lệch tỷ giá"
                      };
                      return [`${value.toLocaleString()} ₫`, labels[name] || name];
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="serviceFee" name="Phí dịch vụ" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="shippingFee" name="Phí vận chuyển" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="inspectionFee" name="Phí kiểm đếm" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="insuranceFee" name="Phí bảo hiểm" stackId="a" fill="#8B5CF6" />
                  <Bar dataKey="entrustmentFee" name="Phí ủy thác Nhập Khẩu" stackId="a" fill="#F97316" />
                  <Bar dataKey="exchangeProfit" name="Chênh lệch tỷ giá" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
