import React, { useEffect, useState, useMemo } from "react";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Plot from "react-plotly.js";

export default function MyAnalytics() {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || { staff_code: "", role: "view_only" };
  const staffCode = user.staff_code;

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await webApi.get("/vms");
      setVms(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to load user analytics:", err);
      setError("Unable to retrieve VM allocation records from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter VMs assigned to current user
  const assignedVms = useMemo(() => {
    return vms.filter((vm) => 
      vm.users && vm.users.some((u) => u.staff_code === staffCode)
    );
  }, [vms, staffCode]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (assignedVms.length === 0) return null;

    const names = assignedVms.map((v) => v.vm_name || "Unnamed");
    const cores = assignedVms.map((v) => Number(v.cores) || 0);
    const ram = assignedVms.map((v) => Number(v.ram) || 0);
    const disk = assignedVms.map((v) => Number(v.disk_size) || 0);

    const statuses = {};
    assignedVms.forEach((vm) => {
      // Find status, check backend/realtime status or database environment fallback
      const status = vm.status || "stopped";
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return {
      names,
      cores,
      ram,
      disk,
      statusLabels: Object.keys(statuses),
      statusValues: Object.values(statuses)
    };
  }, [assignedVms]);

  if (loading) {
    return (
      <PageContainer title="My Analytics">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Generating your personalized resource charts..." />
        </div>
      </PageContainer>
    );
  }

  const hasVms = assignedVms.length > 0;

  return (
    <PageContainer
      title="My Analytics"
      description="Visual resource statistics and compute footprint distribution computed directly from your assigned VMs."
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

      {!hasVms ? (
        <Card className="text-center py-10 text-slate-500">
          No assigned Virtual Machines were found linked to your staff profile code ({staffCode}).
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution Donut */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">VM Status Distribution</h3>
            <div className="h-[300px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: stats.statusLabels.map((l) => l.toUpperCase()),
                    values: stats.statusValues,
                    textinfo: "percent+value",
                    marker: {
                      colors: ["#10B981", "#64748B", "#EF4444"]
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

          {/* CPU Allocation per VM */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">CPU Cores Share per VM Instance</h3>
            <div className="h-[300px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: stats.names,
                    y: stats.cores,
                    marker: { color: "#3B82F6" }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 40, l: 40, r: 20 },
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

          {/* RAM Allocation per VM */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Allocated Memory workload (GB)</h3>
            <div className="h-[300px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: stats.names,
                    y: stats.ram,
                    marker: { color: "#10B981" }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 40, l: 40, r: 20 },
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

          {/* Storage Capacity per VM */}
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Allocated Disk Storage Space (GB)</h3>
            <div className="h-[300px] w-full relative overflow-hidden flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: stats.names,
                    y: stats.disk,
                    marker: { color: "#F59E0B" }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 40, l: 40, r: 20 },
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
        </div>
      )}
    </PageContainer>
  );
}
