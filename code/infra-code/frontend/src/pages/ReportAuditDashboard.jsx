import React, { useState, useEffect, useMemo } from "react";
import Plot from "react-plotly.js";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loader from "../components/Loader";
import proxmoxApi from "../api/proxmoxapi";
import { useTheme } from "../theme/ThemeProvider";
import { BarChart3, PieChart, TrendingUp, Users, ShieldAlert, FileSpreadsheet, Activity } from "lucide-react";

// Plotly styling
const getPlotlyTheme = (theme) => {
  const isDark = theme === "dark";
  return {
    primaryColor: "#3b82f6",
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
    layout: {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { family: "Inter, Roboto, sans-serif", color: isDark ? "#cbd5e1" : "#475569", size: 11 },
      margin: { t: 20, b: 40, l: 40, r: 15 },
      showlegend: true,
      legend: { orientation: "h", y: -0.2, font: { size: 10, color: isDark ? "#cbd5e1" : "#475569" } },
      xaxis: {
        gridcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      },
      yaxis: {
        gridcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      }
    }
  };
};

function KpiCard({ icon, label, value, colorClass }) {
  return (
    <Card className="flex items-center gap-4 border-l-4 border-l-blue-600 p-4">
      <div className={`p-3 rounded-xl shrink-0 ${colorClass}`}>{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{value}</div>
      </div>
    </Card>
  );
}

export default function ReportAuditDashboard() {
  const { currentTheme } = useTheme();
  const tc = getPlotlyTheme(currentTheme);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await proxmoxApi.get("/proxmox/reports/audit-stats");
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load audit statistics:", err);
      setError("Unable to load governance stats. Please ensure you are logged in as an Administrator.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const chartData = useMemo(() => {
    if (!stats) return null;

    // Trend dates and counts
    const trendDates = (stats.trend || []).map((t) => t.date);
    const trendCounts = (stats.trend || []).map((t) => t.count);

    // Format distribution labels and counts
    const formatLabels = Object.keys(stats.format_distribution || {}).map((f) => f.toUpperCase());
    const formatValues = Object.values(stats.format_distribution || {});

    // Generators names and counts
    const genNames = (stats.top_generators || []).map((g) => g.staff_code);
    const genCounts = (stats.top_generators || []).map((g) => g.count);

    return { trendDates, trendCounts, formatLabels, formatValues, genNames, genCounts };
  }, [stats]);

  if (loading) {
    return (
      <PageContainer title="Report Governance Dashboard">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading audit analytics..." />
        </div>
      </PageContainer>
    );
  }

  if (error || !stats) {
    return (
      <PageContainer title="Report Governance Dashboard">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm mb-4">
          {error || "Unable to load governance statistics."}
        </div>
      </PageContainer>
    );
  }

  // Get most used format
  let topFormat = "N/A";
  if (stats.format_distribution && Object.keys(stats.format_distribution).length > 0) {
    topFormat = Object.keys(stats.format_distribution).reduce((a, b) =>
      stats.format_distribution[a] > stats.format_distribution[b] ? a : b
    ).toUpperCase();
  }

  // Get top generator
  const topGenerator = stats.top_generators?.[0]?.staff_code || "N/A";

  return (
    <PageContainer
      title="Reporting & Governance Analytics"
      description="Visual oversight of reporting footprint, resource exports, and system usage logs."
    >
      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Activity size={20} />}
          label="Generated Today"
          value={stats.today_count}
          colorClass="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="Generated This Week"
          value={stats.week_count}
          colorClass="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          icon={<FileSpreadsheet size={20} />}
          label="Most Popular Format"
          value={topFormat}
          colorClass="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Top Report Generator"
          value={topGenerator}
          colorClass="bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Report Volumes Trend */}
        <Card className="p-4 flex flex-col h-[340px]">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-500" /> Report Volume (Past 7 Days)
          </h3>
          <div className="flex-1">
            <Plot
              data={[
                {
                  type: "scatter",
                  mode: "lines+markers",
                  x: chartData.trendDates,
                  y: chartData.trendCounts,
                  line: { color: tc.primaryColor, width: 3 },
                  marker: { size: 8, color: tc.primaryColor },
                  name: "Reports",
                },
              ]}
              layout={{ ...tc.layout, autosize: true }}
              useResizeHandler
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </Card>

        {/* Format Distribution Donut */}
        <Card className="p-4 flex flex-col h-[340px]">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
            <PieChart size={16} className="text-blue-500" /> Export Format Breakdown
          </h3>
          <div className="flex-1">
            <Plot
              data={[
                {
                  type: "pie",
                  hole: 0.5,
                  labels: chartData.formatLabels,
                  values: chartData.formatValues,
                  textinfo: "label+percent",
                  marker: { colors: tc.colors },
                  hoverinfo: "label+value+percent",
                },
              ]}
              layout={{ ...tc.layout, autosize: true, margin: { t: 20, b: 20, l: 20, r: 20 } }}
              useResizeHandler
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </Card>

        {/* Top Report Generators */}
        <Card className="p-4 flex flex-col h-[340px]">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-500" /> Top Generators by Staff Code
          </h3>
          <div className="flex-1">
            <Plot
              data={[
                {
                  type: "bar",
                  x: chartData.genNames,
                  y: chartData.genCounts,
                  marker: { color: tc.colors[1] },
                  hoverinfo: "x+y",
                },
              ]}
              layout={{ ...tc.layout, autosize: true }}
              useResizeHandler
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </Card>

        {/* Top Report Templates */}
        <Card className="p-4 flex flex-col h-[340px] overflow-hidden">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-500" /> Most Popular Templates & Presets
          </h3>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Template Name</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Executions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.top_templates?.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {t.count} times
                    </td>
                  </tr>
                ))}
                {(stats.top_templates || []).length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-400 text-xs">
                      No report executions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
