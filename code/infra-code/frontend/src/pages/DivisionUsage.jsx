import React, { useEffect, useState, useMemo } from "react";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Plot from "react-plotly.js";

export default function DivisionUsage() {
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
      console.error("Failed to load division metrics:", err);
      setError("Unable to retrieve VM allocation records from backend database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregate stats by Division
  const divisionStats = useMemo(() => {
    const stats = {};

    vms.forEach((vm) => {
      // Find division of first user, default to "Unassigned"
      const division = (vm.users && vm.users[0]?.division) || "Unassigned";
      
      const cores = Number(vm.cores) || 0;
      const ram = Number(vm.ram) || 0;
      const disk = Number(vm.disk_size) || 0;

      if (!stats[division]) {
        stats[division] = { count: 0, cores: 0, ram: 0, disk: 0 };
      }

      stats[division].count += 1;
      stats[division].cores += cores;
      stats[division].ram += ram;
      stats[division].disk += disk;
    });

    return stats;
  }, [vms]);

  const chartData = useMemo(() => {
    const divisions = Object.keys(divisionStats);
    const counts = divisions.map((d) => divisionStats[d].count);
    const cores = divisions.map((d) => divisionStats[d].cores);
    const ram = divisions.map((d) => divisionStats[d].ram);

    // Totals for root node of treemaps
    const totalCount = counts.reduce((a, b) => a + b, 0);
    const totalCores = cores.reduce((a, b) => a + b, 0);

    // Format for Treemap 1: VM Allocation
    const vmLabels = ["Divisions", ...divisions];
    const vmParents = ["", ...divisions.map(() => "Divisions")];
    const vmValues = [totalCount, ...counts];

    // Format for Treemap 2: CPU Cores
    const cpuLabels = ["All Resource Cores", ...divisions];
    const cpuParents = ["", ...divisions.map(() => "All Resource Cores")];
    const cpuValues = [totalCores, ...cores];

    return { divisions, counts, cores, ram, vmLabels, vmParents, vmValues, cpuLabels, cpuParents, cpuValues };
  }, [divisionStats]);

  if (loading) {
    return (
      <PageContainer title="Division Capacity Usage">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Generating division analytics..." />
        </div>
      </PageContainer>
    );
  }

  const hasData = chartData.divisions.length > 0;

  // Custom Sunset Gradient hex array
  const sunsetColors = [
    "#36096d", "#5d0e7d", "#841386", "#aa1a82", 
    "#cf2673", "#ef3a5b", "#f95b45", "#ff7f31", "#ffa600"
  ];

  return (
    <PageContainer
      title="Division Capacity Usage"
      description="Allocation metrics, CPU core shares, and memory workloads partitioned by VSSC organizational divisions."
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
          No records found in the database. Ensure users are linked to registered VMs to view organizational allocations.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Treemap Chart 1: VMs per Division */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">VM Allocation Distribution Treemap</h3>
            <div className="h-[380px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "treemap",
                    labels: chartData.vmLabels,
                    parents: chartData.vmParents,
                    values: chartData.vmValues,
                    textinfo: "label+value+percent parent",
                    hovertemplate: "Division: %{label}<br>VMs: %{value}<extra></extra>",
                    marker: {
                      colorscale: "Sunset",
                      colors: sunsetColors
                    }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 10, b: 10, l: 10, r: 10 },
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

          {/* Treemap Chart 2: CPU Cores per Division */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">CPU Core Allocation Treemap</h3>
            <div className="h-[380px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "treemap",
                    labels: chartData.cpuLabels,
                    parents: chartData.cpuParents,
                    values: chartData.cpuValues,
                    textinfo: "label+value+percent parent",
                    hovertemplate: "Division: %{label}<br>Allocated Cores: %{value}<extra></extra>",
                    marker: {
                      colorscale: "Sunsetdark",
                      colors: sunsetColors
                    }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 10, b: 10, l: 10, r: 10 },
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

          {/* Division Detailed Allocation Table */}
          <Card className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 p-0">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">Division Resource Summary</h4>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Division</th>
                  <th className="px-5 py-3 text-center">VMs Provisioned</th>
                  <th className="px-5 py-3 text-center">Allocated Cores</th>
                  <th className="px-5 py-3 text-center">Allocated RAM</th>
                  <th className="px-5 py-3 text-center">Allocated Storage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {chartData.divisions.map((div) => {
                  const s = divisionStats[div];
                  return (
                    <tr key={div} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{div}</td>
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
