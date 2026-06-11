import React, { useEffect, useState, useMemo } from "react";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Plot from "react-plotly.js";

export default function EntityUsage() {
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
      console.error("Failed to load entity metrics:", err);
      setError("Unable to retrieve VM allocation records from backend database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregate stats by Entity
  const entityStats = useMemo(() => {
    const stats = {};

    vms.forEach((vm) => {
      // Find entity of first user, default to "Unassigned"
      const entity = (vm.users && vm.users[0]?.entity) || "Unassigned";
      
      const cores = Number(vm.cores) || 0;
      const ram = Number(vm.ram) || 0;
      const disk = Number(vm.disk_size) || 0;

      if (!stats[entity]) {
        stats[entity] = { count: 0, cores: 0, ram: 0, disk: 0 };
      }

      stats[entity].count += 1;
      stats[entity].cores += cores;
      stats[entity].ram += ram;
      stats[entity].disk += disk;
    });

    return stats;
  }, [vms]);

  const chartData = useMemo(() => {
    const entities = Object.keys(entityStats);
    const counts = entities.map((e) => entityStats[e].count);
    const cores = entities.map((e) => entityStats[e].cores);
    const ram = entities.map((e) => entityStats[e].ram);

    return { entities, counts, cores, ram };
  }, [entityStats]);

  if (loading) {
    return (
      <PageContainer title="Entity Capacity Usage">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Generating entity analytics..." />
        </div>
      </PageContainer>
    );
  }

  const hasData = chartData.entities.length > 0;

  return (
    <PageContainer
      title="Entity Capacity Usage"
      description="Workloads, virtualization ratios, and hardware footprints partitioned by VSSC research entities."
      actions={
        <button 
          onClick={fetchData} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Refresh Data
        </button>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {!hasData ? (
        <Card className="text-center py-10 text-slate-500">
          No records found in the database. Ensure users are linked to registered VMs to view entity allocations.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart: VMs per Entity */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">VM Allocation Distribution</h3>
            <div className="h-[350px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: chartData.entities,
                    values: chartData.counts,
                    textinfo: "percent+value",
                    hovertemplate: "Entity: %{label}<br>VMs: %{value}<br>Ratio: %{percent}<extra></extra>",
                    marker: {
                      colors: ["#10B981", "#1D4ED8", "#EF4444", "#F59E0B", "#8B5CF6", "#64748B"]
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

          {/* Bar Chart: Resource Shares */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">CPU & RAM Allocation Shares</h3>
            <div className="h-[350px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    name: "CPU Cores",
                    x: chartData.entities,
                    y: chartData.cores,
                    marker: { color: "#3B82F6" }
                  },
                  {
                    type: "bar",
                    name: "RAM (GB)",
                    x: chartData.entities,
                    y: chartData.ram,
                    marker: { color: "#10B981" }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 40, l: 40, r: 20 },
                  barmode: "group",
                  showlegend: true,
                  legend: { orientation: "h", y: -0.2 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#64748B" },
                  xaxis: { gridcolor: "transparent" },
                  yaxis: { gridcolor: "rgba(100, 116, 139, 0.1)" }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* Entity Detailed Allocation Table */}
          <Card className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 p-0">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">Entity Resource Summary</h4>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3 text-center">VMs Provisioned</th>
                  <th className="px-5 py-3 text-center">Allocated Cores</th>
                  <th className="px-5 py-3 text-center">Allocated RAM</th>
                  <th className="px-5 py-3 text-center">Allocated Storage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {chartData.entities.map((ent) => {
                  const s = entityStats[ent];
                  return (
                    <tr key={ent} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{ent}</td>
                      <td className="px-5 py-3 text-center font-bold">{s.count}</td>
                      <td className="px-5 py-3 text-center font-mono">{s.cores} Cores</td>
                      <td className="px-5 py-3 text-center font-mono">{s.ram} GB</td>
                      <td className="px-5 py-3 text-center font-mono">{s.disk} GB</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
