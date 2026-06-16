import React, { useEffect, useState, useMemo } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Plot from "react-plotly.js";
import { useTheme } from "../theme/ThemeProvider";
import { Server, Cpu, HardDrive, ShieldCheck, ShieldAlert, Search, ArrowUpDown, Clock } from "lucide-react";

// Format bytes to human readable format
const formatBytes = (bytes) => {
  if (!bytes) return "0 GB";
  const gb = bytes / (1024 ** 3);
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
};

// Format seconds to human readable uptime
const formatUptime = (seconds) => {
  if (!seconds) return "N/A";
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Get Plotly Theme config
const getPlotlyTheme = (role, theme) => {
  const isDark = theme === "dark";
  const primaryColor = role === "manager" ? "#10b981" : "#3b82f6";
  const barColor = role === "manager" ? "#34d399" : "#60a5fa";

  return {
    primaryColor,
    barColor,
    layout: {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: {
        family: "Inter, Roboto, sans-serif",
        color: isDark ? "#cbd5e1" : "#475569",
        size: 11
      },
      margin: { t: 30, b: 40, l: 40, r: 15 },
      xaxis: {
        gridcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        linecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        zerolinecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      },
      yaxis: {
        gridcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        linecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        zerolinecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      }
    }
  };
};

export default function NodesList() {
  const { currentTheme } = useTheme();

  // Resolve Role for Color Accents
  const user = JSON.parse(localStorage.getItem("user")) || { staff_code: "N/A", role: "view_only" };
  let role = user.role;
  if (role === "view_only") {
    if (user.staff_code === "manager") {
      role = "manager";
    } else {
      role = "user";
    }
  }

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("node_name");
  const [sortDirection, setSortDirection] = useState("asc");

  const themeConfig = useMemo(() => getPlotlyTheme(role, currentTheme), [role, currentTheme]);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await proxmoxApi.get("/proxmox/nodes/");
      setNodes(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch node info:", err);
      setError("Unable to communicate with the hypervisor nodes API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const params = new URLSearchParams(window.location.search);
    const nodeParam = params.get("node");
    if (nodeParam) {
      setSearchTerm(nodeParam);
    }
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter & Sort Logic
  const filteredAndSortedNodes = useMemo(() => {
    let result = nodes.filter((node) => {
      const search = searchTerm.toLowerCase();
      return (
        node.node_name?.toLowerCase().includes(search) ||
        node.cluster_name?.toLowerCase().includes(search) ||
        node.ip?.toLowerCase().includes(search) ||
        node.hypervisor?.toLowerCase().includes(search) ||
        node.model?.toLowerCase().includes(search)
      );
    });

    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string") {
          valA = valA.toLowerCase();
          valB = (valB || "").toLowerCase();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [nodes, searchTerm, sortField, sortDirection]);

  if (loading) {
    return (
      <PageContainer title="Nodes Status">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Fetching node details..." />
        </div>
      </PageContainer>
    );
  }

  // Summary Metrics
  const totalNodesCount = nodes.length;
  const onlineNodesCount = nodes.filter((n) => n.live_status).length;
  const offlineNodesCount = totalNodesCount - onlineNodesCount;
  const totalCores = nodes.reduce((acc, curr) => acc + (curr.total_cores || 0), 0);
  const totalMem = nodes.reduce((acc, curr) => acc + (curr.total_mem || 0), 0);

  // Chart Data mappings
  const nodeNames = nodes.map((n) => n.node_name);
  const nodeMemsGb = nodes.map((n) => (n.total_mem || 0) / (1024 ** 3));
  const nodeCores = nodes.map((n) => n.total_cores || 0);
  const nodeUptimesDays = nodes.map((n) => (n.uptime || 0) / (3600 * 24));

  return (
    <PageContainer
      title="Nodes Status"
      description="Real-time configuration, hardware profiles, and operation statuses of hypervisor cluster nodes."
      actions={
        <button
          onClick={fetchNodes}
          className="px-4 py-2 bg-role-primary hover:bg-role-primary-hover text-white rounded-xl text-sm font-semibold transition"
        >
          Refresh Nodes
        </button>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        {/* Total Nodes */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-role-primary-light text-role-primary rounded-xl shrink-0">
            <Server size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Nodes</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalNodesCount}</div>
          </div>
        </Card>

        {/* Online Nodes */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Online Nodes</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{onlineNodesCount}</div>
          </div>
        </Card>

        {/* Offline Nodes */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-xl shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Offline Nodes</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{offlineNodesCount}</div>
          </div>
        </Card>

        {/* Total RAM */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Combined Memory</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{formatBytes(totalMem)}</div>
          </div>
        </Card>

        {/* Total CPU Cores */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <Cpu size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Combined CPU Cores</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalCores} Cores</div>
          </div>
        </Card>
      </div>

      {/* Filter and Inventory Table Panel */}
      <Card className="p-0 overflow-hidden mb-8">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2">
          <Search className="text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search nodes by name, cluster, IP, hypervisor type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm bg-white dark:bg-slate-900/40">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort("node_name")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Node Name <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("cluster_name")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Cluster <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("live_status")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Status <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("ip")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">IP Address <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("uptime")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Uptime <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("total_cores")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition text-center"
                >
                  <div className="flex items-center gap-1 justify-center">Cores <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("total_mem")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">RAM Capacity <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("hypervisor")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Hypervisor <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-5 py-4 font-semibold">Processor Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAndSortedNodes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-500 bg-white dark:bg-slate-900/10">
                    No matching hypervisor nodes found.
                  </td>
                </tr>
              ) : (
                filteredAndSortedNodes.map((node) => (
                  <tr
                    key={node.node_name}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  >
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-50">{node.node_name}</td>
                    <td className="px-5 py-4 font-semibold">{node.cluster_name || "N/A"}</td>
                    <td className="px-5 py-4">
                      <Badge variant={node.live_status ? "success" : "danger"}>
                        {node.live_status ? "online" : "offline"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{node.ip || "N/A"}</td>
                    <td className="px-5 py-4 font-mono text-xs">{formatUptime(node.uptime)}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-800 dark:text-slate-200">
                      {node.total_cores}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold">{formatBytes(node.total_mem)}</td>
                    <td className="px-5 py-4 font-mono text-xs">{node.hypervisor || "N/A"}</td>
                    <td className="px-5 py-4 text-xs max-w-[200px] truncate text-slate-500" title={node.model}>
                      {node.model || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Analytics Row — 3 Plotly Charts */}
      {nodes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Memory Capacity */}
          <Card className="p-4 flex flex-col justify-between h-[340px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Memory Capacity (GB)
            </h3>
            <div className="flex-1 min-h-[260px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: nodeNames,
                    y: nodeMemsGb,
                    marker: { color: themeConfig.primaryColor },
                    text: nodeMemsGb.map((v) => `${v.toFixed(0)} GB`),
                    textposition: "auto"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* CPU Core Capacity */}
          <Card className="p-4 flex flex-col justify-between h-[340px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              CPU Core Count
            </h3>
            <div className="flex-1 min-h-[260px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: nodeNames,
                    y: nodeCores,
                    marker: { color: themeConfig.barColor },
                    text: nodeCores.map((v) => `${v} Cores`),
                    textposition: "auto"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* Node Uptime */}
          <Card className="p-4 flex flex-col justify-between h-[340px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Uptime Comparison (Days)
            </h3>
            <div className="flex-1 min-h-[260px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: nodeNames,
                    y: nodeUptimesDays,
                    marker: { color: "#8b5cf6" }, // Purple trace
                    text: nodeUptimesDays.map((v) => `${v.toFixed(1)}d`),
                    textposition: "auto"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true
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
