import React, { useEffect, useState, useMemo } from "react";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Plot from "react-plotly.js";

export default function CapacityProjections() {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectionModel, setProjectionModel] = useState("linear");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await webApi.get("/vms");
      setVms(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to load projection metrics:", err);
      setError("Unable to retrieve VM allocation records from backend database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute growth timeline and project 6 months ahead
  const projectionsData = useMemo(() => {
    if (vms.length === 0) return null;

    // Parse dates and sort chronologically
    const parsedVms = vms
      .map((vm) => {
        let date = new Date(vm.time_created);
        if (isNaN(date.getTime())) {
          date = new Date(); // fallback
        }
        return {
          date,
          cores: Number(vm.cores) || 0,
          ram: Number(vm.ram) || 0,
          disk: Number(vm.disk_size) || 0,
        };
      })
      .sort((a, b) => a.date - b.date);

    // Group by month
    const monthlyAllocations = {};
    parsedVms.forEach((vm) => {
      const monthKey = `${vm.date.getFullYear()}-${String(vm.date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyAllocations[monthKey]) {
        monthlyAllocations[monthKey] = { cores: 0, ram: 0, disk: 0, count: 0 };
      }
      monthlyAllocations[monthKey].cores += vm.cores;
      monthlyAllocations[monthKey].ram += vm.ram;
      monthlyAllocations[monthKey].disk += vm.disk;
      monthlyAllocations[monthKey].count += 1;
    });

    const months = Object.keys(monthlyAllocations).sort();
    
    // Compute cumulative metrics
    let cumCores = 0;
    let cumRam = 0;
    let cumDisk = 0;
    let cumCount = 0;

    const historicalData = months.map((m) => {
      cumCores += monthlyAllocations[m].cores;
      cumRam += monthlyAllocations[m].ram;
      cumDisk += monthlyAllocations[m].disk;
      cumCount += monthlyAllocations[m].count;
      return {
        month: m,
        cores: cumCores,
        ram: cumRam,
        disk: cumDisk,
        count: cumCount,
      };
    });

    // Run simple linear regression / growth rate for projections
    // If only 1 month or less, assume 5% monthly growth rate
    const lastMonthIdx = historicalData.length - 1;
    const lastCores = historicalData[lastMonthIdx].cores;
    const lastRam = historicalData[lastMonthIdx].ram;
    const lastDisk = historicalData[lastMonthIdx].disk;

    const projectedData = [];
    const lastDateStr = historicalData[lastMonthIdx].month;
    const [year, month] = lastDateStr.split("-").map(Number);

    if (projectionModel === "linear") {
      let monthlyCoresGrowth = lastCores * 0.05;
      let monthlyRamGrowth = lastRam * 0.05;
      let monthlyDiskGrowth = lastDisk * 0.05;

      if (historicalData.length > 1) {
        const firstCores = historicalData[0].cores;
        const firstRam = historicalData[0].ram;
        const firstDisk = historicalData[0].disk;
        const totalMonths = historicalData.length;

        monthlyCoresGrowth = (lastCores - firstCores) / (totalMonths - 1) || (lastCores * 0.03);
        monthlyRamGrowth = (lastRam - firstRam) / (totalMonths - 1) || (lastRam * 0.03);
        monthlyDiskGrowth = (lastDisk - firstDisk) / (totalMonths - 1) || (lastDisk * 0.03);
      }

      for (let i = 1; i <= 6; i++) {
        const nextDate = new Date(year, month - 1 + i, 1);
        const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
        projectedData.push({
          month: nextMonthStr,
          cores: Math.max(0, Math.round(lastCores + monthlyCoresGrowth * i)),
          ram: Math.max(0, Math.round(lastRam + monthlyRamGrowth * i)),
          disk: Math.max(0, Math.round(lastDisk + monthlyDiskGrowth * i)),
        });
      }
    } else if (projectionModel === "exponential") {
      let rCores = 0.05;
      let rRam = 0.05;
      let rDisk = 0.05;

      if (historicalData.length > 1) {
        const firstCores = historicalData[0].cores;
        const firstRam = historicalData[0].ram;
        const firstDisk = historicalData[0].disk;
        const totalMonths = historicalData.length;

        if (firstCores > 0 && lastCores > 0) {
          rCores = (lastCores / firstCores) ** (1 / (totalMonths - 1)) - 1;
        }
        if (firstRam > 0 && lastRam > 0) {
          rRam = (lastRam / firstRam) ** (1 / (totalMonths - 1)) - 1;
        }
        if (firstDisk > 0 && lastDisk > 0) {
          rDisk = (lastDisk / firstDisk) ** (1 / (totalMonths - 1)) - 1;
        }
      }

      rCores = Math.max(-0.5, Math.min(0.5, rCores));
      rRam = Math.max(-0.5, Math.min(0.5, rRam));
      rDisk = Math.max(-0.5, Math.min(0.5, rDisk));

      for (let i = 1; i <= 6; i++) {
        const nextDate = new Date(year, month - 1 + i, 1);
        const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
        projectedData.push({
          month: nextMonthStr,
          cores: Math.max(0, Math.round(lastCores * ((1 + rCores) ** i))),
          ram: Math.max(0, Math.round(lastRam * ((1 + rRam) ** i))),
          disk: Math.max(0, Math.round(lastDisk * ((1 + rDisk) ** i))),
        });
      }
    } else {
      const totalMonths = historicalData.length || 1;
      const stepCores = lastCores / totalMonths;
      const stepRam = lastRam / totalMonths;
      const stepDisk = lastDisk / totalMonths;

      for (let i = 1; i <= 6; i++) {
        const nextDate = new Date(year, month - 1 + i, 1);
        const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
        projectedData.push({
          month: nextMonthStr,
          cores: Math.max(0, Math.round(lastCores + stepCores * i)),
          ram: Math.max(0, Math.round(lastRam + stepRam * i)),
          disk: Math.max(0, Math.round(lastDisk + stepDisk * i)),
        });
      }
    }

    return {
      historical: historicalData,
      projected: projectedData,
    };
  }, [vms, projectionModel]);

  const chartPlots = useMemo(() => {
    if (!projectionsData) return null;

    const histX = projectionsData.historical.map((h) => h.month);
    const histCores = projectionsData.historical.map((h) => h.cores);
    const histRam = projectionsData.historical.map((h) => h.ram);

    // Projection includes the last historical month for continuity
    const lastHist = projectionsData.historical[projectionsData.historical.length - 1];
    const projX = [lastHist.month, ...projectionsData.projected.map((p) => p.month)];
    const projCores = [lastHist.cores, ...projectionsData.projected.map((p) => p.cores)];
    const projRam = [lastHist.ram, ...projectionsData.projected.map((p) => p.ram)];

    return { histX, histCores, histRam, projX, projCores, projRam };
  }, [projectionsData]);

  if (loading) {
    return (
      <PageContainer title="Capacity Projections">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Analyzing capacity growth rates..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Capacity Projections"
      description="Historical inventory resource growth mapping and 6-month capacity growth projections."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={projectionModel}
            onChange={(e) => setProjectionModel(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none text-sm font-semibold transition focus:border-blue-500"
          >
            <option value="linear" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Linear Growth Model</option>
            <option value="exponential" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Exponential Growth Model</option>
            <option value="average" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Average Load Model</option>
          </select>
          <button 
            onClick={fetchData} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md"
          >
            Recalculate Projections
          </button>
        </div>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {!projectionsData ? (
        <Card className="text-center py-10 text-slate-500">
          No data available to calculate capacity projections.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Core Projections */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">CPU Core Share Projection</h3>
            <div className="h-[350px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    x: chartPlots.histX,
                    y: chartPlots.histCores,
                    type: "scatter",
                    mode: "lines+markers",
                    name: "Historical Cores",
                    line: { color: "#3B82F6", width: 3 },
                    marker: { size: 6 }
                  },
                  {
                    x: chartPlots.projX,
                    y: chartPlots.projCores,
                    type: "scatter",
                    mode: "lines",
                    name: "Projected Growth",
                    line: { color: "#93C5FD", width: 3, dash: "dash" }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 40, l: 40, r: 20 },
                  showlegend: true,
                  legend: { orientation: "h", y: -0.2 },
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

          {/* Memory (GB) Projections */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Memory Allocation Projection</h3>
            <div className="h-[350px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    x: chartPlots.histX,
                    y: chartPlots.histRam,
                    type: "scatter",
                    mode: "lines+markers",
                    name: "Historical RAM (GB)",
                    line: { color: "#10B981", width: 3 },
                    marker: { size: 6 }
                  },
                  {
                    x: chartPlots.projX,
                    y: chartPlots.projRam,
                    type: "scatter",
                    mode: "lines",
                    name: "Projected Growth",
                    line: { color: "#A7F3D0", width: 3, dash: "dash" }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 40, l: 40, r: 20 },
                  showlegend: true,
                  legend: { orientation: "h", y: -0.2 },
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

          {/* Project Details */}
          <Card className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 p-0">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-800 dark:text-slate-100">
              Future Capacity Timeline Estimations
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Projected Month</th>
                  <th className="px-5 py-3 text-center">Estimated Total CPU Cores</th>
                  <th className="px-5 py-3 text-center">Estimated Total RAM</th>
                  <th className="px-5 py-3 text-center">Estimation Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {projectionsData.projected.map((proj) => (
                  <tr key={proj.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{proj.month}</td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{proj.cores} Cores</td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{proj.ram} GB</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {projectionModel === "linear" ? "Linear Trend Model" : projectionModel === "exponential" ? "Exponential Growth Model" : "Average Load Model"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
