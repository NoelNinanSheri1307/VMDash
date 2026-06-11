import React, { useEffect, useState, useMemo } from "react";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Plot from "react-plotly.js";

export default function PerformanceTrends() {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await webApi.get("/vms");
      setVms(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to load performance trends:", err);
      setError("Unable to retrieve VM allocation records from backend database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute timeline of creations
  const timelineData = useMemo(() => {
    if (vms.length === 0) return null;

    const sorted = [...vms]
      .map((vm) => {
        let date = new Date(vm.time_created);
        if (isNaN(date.getTime())) {
          date = new Date();
        }
        return { date };
      })
      .sort((a, b) => a.date - b.date);

    const counts = {};
    sorted.forEach((item) => {
      const month = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`;
      counts[month] = (counts[month] || 0) + 1;
    });

    const months = Object.keys(counts).sort();
    let cumulative = 0;
    const values = months.map((m) => {
      cumulative += counts[m];
      return cumulative;
    });

    return { months, values };
  }, [vms]);

  // Group by environment
  const envData = useMemo(() => {
    const envs = {};
    vms.forEach((vm) => {
      const env = vm.environment || "production";
      envs[env] = (envs[env] || 0) + 1;
    });
    return {
      labels: Object.keys(envs),
      values: Object.values(envs),
    };
  }, [vms]);

  if (loading) {
    return (
      <PageContainer title="Performance Trends">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Generating timeline analytics..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Performance Trends"
      description="Workload accumulation timelines and system deployment distributions."
      actions={
        <button 
          onClick={fetchData} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Refresh Trends
        </button>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {!timelineData ? (
        <Card className="text-center py-10 text-slate-500">
          No records found in database.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plot: VM Deployment Growth */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">VM Count Growth Rate (Cumulative)</h3>
            <div className="h-[350px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    x: timelineData.months,
                    y: timelineData.values,
                    type: "scatter",
                    mode: "lines+markers",
                    line: { color: "#1D4ED8", width: 3 },
                    marker: { size: 6 }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 45, l: 45, r: 20 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#64748B" },
                  xaxis: { gridcolor: "rgba(100, 116, 139, 0.05)" },
                  yaxis: { gridcolor: "rgba(100, 116, 139, 0.1)" }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* Plot: Environment work distribution */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Environment Workloads Distribution</h3>
            <div className="h-[350px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: envData.labels.map(l => l.toUpperCase()),
                    values: envData.values,
                    textinfo: "percent+value",
                    marker: {
                      colors: ["#EF4444", "#F59E0B", "#10B981", "#1D4ED8"]
                    }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 20, l: 20, r: 20 },
                  showlegend: true,
                  legend: { orientation: "h", y: -0.1 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#64748B" }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
