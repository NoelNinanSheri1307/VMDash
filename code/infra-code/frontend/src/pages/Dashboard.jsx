import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import webApi from "../api/webapi";
import proxmoxApi from "../api/proxmoxapi";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useTheme } from "../theme/ThemeProvider";
import { motion } from "framer-motion";
import {
  Monitor,
  Cpu,
  HardDrive,
  Layers,
  Server,
  Database,
  Activity,
  Play,
  Square,
  AlertTriangle,
  Users,
  PieChart,
  BarChart,
  Network
} from "lucide-react";

// Format size from GB to appropriate label
const formatGB = (gb) => {
  if (!gb) return "0 GB";
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
};

// Plotly Theme helper
const getPlotlyTheme = (role, theme) => {
  const isDark = theme === "dark";
  
  let primaryColor = "#3b82f6"; // Admin
  let colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];
  
  if (role === "manager") {
    primaryColor = "#10b981"; // Manager Green
    colors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];
  } else if (role === "user") {
    primaryColor = "#ef4444"; // User Red
    colors = ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"];
  }

  return {
    primaryColor,
    colors,
    layout: {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: {
        family: "Inter, Roboto, sans-serif",
        color: isDark ? "#cbd5e1" : "#475569",
        size: 11
      },
      margin: { t: 30, b: 30, l: 40, r: 15 },
      showlegend: true,
      legend: {
        orientation: "h",
        y: -0.15,
        font: { size: 10, color: isDark ? "#cbd5e1" : "#475569" }
      },
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

export default function Dashboard() {
  const { currentTheme } = useTheme();
  
  // Resolve Role
  const user = JSON.parse(localStorage.getItem("user")) || { staff_code: "N/A", role: "view_only" };
  let role = user.role;
  if (role === "view_only") {
    if (user.staff_code === "manager") {
      role = "manager";
    } else {
      role = "user";
    }
  }
  const staffCode = user.staff_code;

  // States
  const [userVms, setUserVms] = useState([]);
  const [userLoading, setUserLoading] = useState(true);

  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [error, setError] = useState("");

  const themeConfig = useMemo(() => getPlotlyTheme(role, currentTheme), [role, currentTheme]);

  // Fetch User specific data
  useEffect(() => {
    if (role !== "user") return;
    const fetchUserVms = async () => {
      try {
        setUserLoading(true);
        const res = await webApi.get("/vms");
        const filtered = res.data.filter((vm) =>
          vm.users && vm.users.some((u) => u.staff_code === staffCode)
        );
        setUserVms(filtered);
        setError("");
      } catch (err) {
        console.error("Failed to load user dashboard VMs:", err);
        setError("Could not retrieve assigned virtual machines.");
      } finally {
        setUserLoading(false);
      }
    };
    fetchUserVms();
  }, [role, staffCode]);

  // Fetch Admin/Manager full data
  const fetchAdminDashboard = async () => {
    try {
      setAdminLoading(true);
      const [vmsRes, nodesRes, clustersRes, storageRes, webVmsRes] = await Promise.all([
        proxmoxApi.get("/proxmox/vms/vmData"),
        proxmoxApi.get("/proxmox/nodes/"),
        proxmoxApi.get("/proxmox/cluster/"),
        proxmoxApi.get("/proxmox/storage/"),
        webApi.get("/vms")
      ]);

      setAdminData({
        vms: vmsRes.data,
        nodes: nodesRes.data,
        clusters: clustersRes.data,
        storage: storageRes.data,
        webVms: webVmsRes.data
      });
      setError("");
    } catch (err) {
      console.error("Failed to fetch full dashboard metrics:", err);
      setError("Unable to sync operations center metrics from system backend.");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (role === "user") return;
    fetchAdminDashboard();
  }, [role]);

  // ----------------------------------------------------
  // RENDER USER DASHBOARD
  // ----------------------------------------------------
  if (role === "user") {
    if (userLoading) {
      return (
        <div className="flex justify-center items-center h-[70vh]">
          <Loader text="Loading personalized dashboard..." />
        </div>
      );
    }

    const totalVmsCount = userVms.length;
    const totalCores = userVms.reduce((acc, curr) => acc + (Number(curr.cores) || 0), 0);
    const totalRam = userVms.reduce((acc, curr) => acc + (Number(curr.ram) || 0), 0);
    const totalDisk = userVms.reduce((acc, curr) => acc + (Number(curr.disk_size) || 0), 0);

    const statusCounts = {};
    userVms.forEach((vm) => {
      const st = (vm.status || "stopped").toLowerCase();
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const vmNames = userVms.map((vm) => vm.vm_name || "Unnamed");
    const vmCores = userVms.map((vm) => Number(vm.cores) || 0);
    const vmRam = userVms.map((vm) => Number(vm.ram) || 0);
    const vmDisk = userVms.map((vm) => Number(vm.disk_size) || 0);

    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personal resource allocations and operations status for Staff Profile:{" "}
            <span className="font-semibold text-role-primary">{staffCode}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {totalVmsCount === 0 ? (
          <Card className="text-center py-16 text-slate-500">
            <Monitor className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={48} />
            <div className="text-lg font-bold">No Virtual Machines Assigned</div>
            <p className="text-sm mt-1 max-w-md mx-auto">
              There are currently no synchronized or registered VMs linked to your employee profile.
            </p>
          </Card>
        ) : (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="flex items-center gap-4 border-l-4 border-l-red-500">
                <div className="p-3 bg-role-primary-light text-role-primary rounded-xl">
                  <Monitor size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    My VMs
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {totalVmsCount}
                  </div>
                </div>
              </Card>

              <Card className="flex items-center gap-4 border-l-4 border-l-red-500">
                <div className="p-3 bg-role-primary-light text-role-primary rounded-xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    My CPU Allocation
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {totalCores} <span className="text-xs font-normal text-slate-500">Cores</span>
                  </div>
                </div>
              </Card>

              <Card className="flex items-center gap-4 border-l-4 border-l-red-500">
                <div className="p-3 bg-role-primary-light text-role-primary rounded-xl">
                  <HardDrive size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    My RAM Allocation
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {totalRam} <span className="text-xs font-normal text-slate-500">GB</span>
                  </div>
                </div>
              </Card>

              <Card className="flex items-center gap-4 border-l-4 border-l-red-500">
                <div className="p-3 bg-role-primary-light text-role-primary rounded-xl">
                  <Database size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    My Storage Allocation
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {totalDisk} <span className="text-xs font-normal text-slate-500">GB</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* VM Status Distribution */}
              <Card className="p-4 flex flex-col justify-between h-[380px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    VM Status Distribution
                  </h3>
                  <Badge variant="info">Status Ratio</Badge>
                </div>
                <div className="flex-1 min-h-[300px] flex items-center justify-center">
                  <Plot
                    data={[
                      {
                        type: "pie",
                        hole: 0.55,
                        labels: Object.keys(statusCounts).map((s) => s.toUpperCase()),
                        values: Object.values(statusCounts),
                        textinfo: "percent+value",
                        marker: {
                          colors: [themeConfig.primaryColor, "#cbd5e1", "#64748b"]
                        },
                        hoverinfo: "label+value+percent"
                      }
                    ]}
                    layout={{
                      ...themeConfig.layout,
                      autosize: true,
                      margin: { t: 20, b: 20, l: 20, r: 20 }
                    }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: false, responsive: true }}
                  />
                </div>
              </Card>

              {/* Resource Allocation Footprint */}
              <Card className="p-4 flex flex-col justify-between h-[380px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Resource Footprint
                  </h3>
                  <Badge variant="info">Aggregates</Badge>
                </div>
                <div className="flex-1 min-h-[300px] flex items-center justify-center">
                  <Plot
                    data={[
                      {
                        type: "bar",
                        name: "Cores",
                        x: vmNames,
                        y: vmCores,
                        marker: { color: themeConfig.colors[0] }
                      },
                      {
                        type: "bar",
                        name: "RAM (GB)",
                        x: vmNames,
                        y: vmRam,
                        marker: { color: themeConfig.colors[1] }
                      },
                      {
                        type: "bar",
                        name: "Disk (GB)",
                        x: vmNames,
                        y: vmDisk,
                        marker: { color: themeConfig.colors[2] }
                      }
                    ]}
                    layout={{
                      ...themeConfig.layout,
                      barmode: "group",
                      autosize: true,
                      margin: { t: 20, b: 40, l: 30, r: 10 }
                    }}
                    useResizeHandler
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: false, responsive: true }}
                  />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER ADMIN / MANAGER INFRASTRUCTURE OPERATIONS CENTER
  // ----------------------------------------------------
  if (adminLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader text="Loading operations metrics..." />
      </div>
    );
  }

  const { vms = [], nodes = [], clusters = [], storage = [], webVms = [] } = adminData || {};

  // KPI calculations
  const totalVmsCount = vms.length;
  const runningVmsCount = vms.filter((v) => (v.status || "").toLowerCase() === "running").length;
  const stoppedVmsCount = vms.filter((v) => (v.status || "").toLowerCase() === "stopped").length;
  const totalNodesCount = nodes.length;
  const totalClustersCount = clusters.length;
  const totalStoragePoolsCount = storage.length;

  // Allocated Resources Summary
  const totalAllocatedCpu = vms.reduce((acc, curr) => acc + (Number(curr.vm_cpu) || 0), 0);
  const totalAllocatedRam = vms.reduce((acc, curr) => acc + (Number(curr.vm_max_mem) || 0), 0);
  const totalAllocatedDisk = vms.reduce((acc, curr) => acc + (Number(curr.vm_max_disk) || 0), 0);

  // System Health logs
  const offlineNodes = nodes.filter((n) => !n.live_status);
  const offlineStorage = storage.filter((s) => !s.live_status);
  const healthy = offlineNodes.length === 0 && offlineStorage.length === 0;

  // Ownership Distribution Calculations
  const entityCounts = {};
  const divisionCounts = {};
  const groupCounts = {};

  webVms.forEach((vm) => {
    if (vm.users && vm.users.length > 0) {
      vm.users.forEach((u) => {
        const ent = u.entity || "Unassigned";
        const div = u.division || "Unassigned";
        const grp = u.groupname || "Unassigned";

        entityCounts[ent] = (entityCounts[ent] || 0) + 1;
        divisionCounts[div] = (divisionCounts[div] || 0) + 1;
        groupCounts[grp] = (groupCounts[grp] || 0) + 1;
      });
    } else {
      entityCounts["Unassigned"] = (entityCounts["Unassigned"] || 0) + 1;
      divisionCounts["Unassigned"] = (divisionCounts["Unassigned"] || 0) + 1;
      groupCounts["Unassigned"] = (groupCounts["Unassigned"] || 0) + 1;
    }
  });

  // OS, Cluster, Node Distributions (derived from vms)
  const osCounts = {};
  const vmClusterCounts = {};
  const vmNodeCounts = {};

  vms.forEach((vm) => {
    // OS
    const os = vm.os || "Unknown OS";
    osCounts[os] = (osCounts[os] || 0) + 1;

    // Cluster
    const cls = vm.cluster_name || "Standalone";
    vmClusterCounts[cls] = (vmClusterCounts[cls] || 0) + 1;

    // Node
    const nd = vm.node_name || "Unknown Node";
    vmNodeCounts[nd] = (vmNodeCounts[nd] || 0) + 1;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Infrastructure Operations Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time visual monitoring, resource aggregates, and system inventory indicators.
          </p>
        </div>

        <button
          onClick={fetchAdminDashboard}
          className="px-4 py-2 text-white bg-role-primary hover:bg-role-primary-hover text-sm font-semibold rounded-xl transition duration-150 shrink-0 shadow-sm"
        >
          Refresh Live Metrics
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SECTION A — KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total VMs */}
        <Card className="flex items-center gap-3 border-l-4 border-l-role-primary">
          <div className="p-2.5 bg-role-primary-light text-role-primary rounded-xl shrink-0">
            <Monitor size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total VMs
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalVmsCount}
            </div>
          </div>
        </Card>

        {/* Running VMs */}
        <Card className="flex items-center gap-3 border-l-4 border-l-emerald-500">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <Play size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Running VMs
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {runningVmsCount}
            </div>
          </div>
        </Card>

        {/* Stopped VMs */}
        <Card className="flex items-center gap-3 border-l-4 border-l-amber-500">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Square size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Stopped VMs
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {stoppedVmsCount}
            </div>
          </div>
        </Card>

        {/* Total Nodes */}
        <Card className="flex items-center gap-3 border-l-4 border-l-indigo-500">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Server size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Nodes
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalNodesCount}
            </div>
          </div>
        </Card>

        {/* Total Clusters */}
        <Card className="flex items-center gap-3 border-l-4 border-l-purple-500">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Clusters
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalClustersCount}
            </div>
          </div>
        </Card>

        {/* Total Storage Pools */}
        <Card className="flex items-center gap-3 border-l-4 border-l-sky-500">
          <div className="p-2.5 bg-sky-100 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-xl shrink-0">
            <Database size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Storage Pools
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalStoragePoolsCount}
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION B & C — Health Badges, Status Logs & Resource Allocation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Allocation Summary (Allocated Resources) */}
        <Card className="p-4 flex flex-col justify-between h-[280px]">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Cpu className="text-role-primary" size={16} /> Allocated Resources
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Sum of hardware limits allocated across all synced virtual machines.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-300 mb-1">
                <span>CPU Cores</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{totalAllocatedCpu} Cores</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-role-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((totalAllocatedCpu / 500) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-300 mb-1">
                <span>Memory (RAM)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatGB(totalAllocatedRam)}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-role-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((totalAllocatedRam / 2048) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-300 mb-1">
                <span>Disk Space</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatGB(totalAllocatedDisk)}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-role-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((totalAllocatedDisk / 10240) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Node Status Logs */}
        <Card className="p-4 flex flex-col h-[280px]">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between mb-3 shrink-0">
            <span className="flex items-center gap-2">
              <Server className="text-role-primary" size={16} /> Nodes Status
            </span>
            <Badge variant={offlineNodes.length === 0 ? "success" : "danger"}>
              {offlineNodes.length === 0 ? "all online" : `${offlineNodes.length} offline`}
            </Badge>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {nodes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No nodes configured.</div>
            ) : (
              nodes.map((node) => (
                <div
                  key={node.node_name}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs hover:bg-slate-100/55 dark:hover:bg-slate-800/80 transition"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-100">{node.node_name}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{node.ip}</span>
                  <Badge variant={node.live_status ? "success" : "danger"}>
                    {node.live_status ? "online" : "offline"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Storage Status Logs */}
        <Card className="p-4 flex flex-col h-[280px]">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between mb-3 shrink-0">
            <span className="flex items-center gap-2">
              <HardDrive className="text-role-primary" size={16} /> Storage Pools
            </span>
            <Badge variant={offlineStorage.length === 0 ? "success" : "danger"}>
              {offlineStorage.length === 0 ? "all active" : `${offlineStorage.length} inactive`}
            </Badge>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {storage.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No storage pools configured.</div>
            ) : (
              storage.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs hover:bg-slate-100/55 dark:hover:bg-slate-800/80 transition"
                >
                  <div className="overflow-hidden mr-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                      {st.storage_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono capitalize">
                      {st.storage_type} ({st.node_name})
                    </span>
                  </div>
                  <Badge variant={st.live_status ? "success" : "danger"}>
                    {st.live_status ? "active" : "inactive"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* System Warning Banner for Offline Assets */}
      {!healthy && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 rounded-xl text-sm"
        >
          <AlertTriangle className="shrink-0" size={20} />
          <div>
            <span className="font-bold">Operational Alert:</span> Some hypervisor nodes or storage systems are currently
            offline or unreachable. System analytics are constrained to responsive online units.
          </div>
        </motion.div>
      )}

      {/* SECTION D — Ownership Distribution */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-role-primary" size={18} /> Corporate Ownership Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ownership metrics mapped strictly from active VM to staff database relationships.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VMs By Entity */}
          <Card className="p-4 flex flex-col justify-between h-[340px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              VMs By Corporate Entity
            </h3>
            <div className="flex-1 min-h-[260px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.55,
                    labels: Object.keys(entityCounts).map((s) => s.toUpperCase()),
                    values: Object.values(entityCounts),
                    textinfo: "percent+value",
                    marker: { colors: themeConfig.colors },
                    hoverinfo: "label+value+percent"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 10, b: 10, l: 10, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* VMs By Division */}
          <Card className="p-4 flex flex-col justify-between h-[340px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              VMs By division
            </h3>
            <div className="flex-1 min-h-[260px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: Object.keys(divisionCounts),
                    y: Object.values(divisionCounts),
                    marker: { color: themeConfig.primaryColor }
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 15, b: 40, l: 30, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* VMs By Group */}
          <Card className="p-4 flex flex-col justify-between h-[340px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              VMs By Group
            </h3>
            <div className="flex-1 min-h-[260px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: Object.keys(groupCounts),
                    y: Object.values(groupCounts),
                    marker: { color: themeConfig.colors[1] }
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 15, b: 40, l: 30, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION E — Infrastructure Distribution */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="text-role-primary" size={18} /> Hypervisor Infrastructure Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Workload distribution, hypervisor configurations, and live operational stats.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* VMs per Cluster */}
          <Card className="p-4 flex flex-col justify-between h-[300px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              VMs per Cluster
            </h3>
            <div className="flex-1 min-h-[220px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: Object.keys(vmClusterCounts),
                    values: Object.values(vmClusterCounts),
                    textinfo: "value+percent",
                    marker: { colors: themeConfig.colors },
                    hoverinfo: "label+value"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 10, b: 10, l: 10, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* VMs per Node */}
          <Card className="p-4 flex flex-col justify-between h-[300px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              VMs per Node
            </h3>
            <div className="flex-1 min-h-[220px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: Object.keys(vmNodeCounts),
                    y: Object.values(vmNodeCounts),
                    marker: { color: themeConfig.primaryColor }
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 15, b: 35, l: 30, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* OS Distribution */}
          <Card className="p-4 flex flex-col justify-between h-[300px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Operating Systems
            </h3>
            <div className="flex-1 min-h-[220px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: Object.keys(osCounts),
                    values: Object.values(osCounts),
                    textinfo: "value+percent",
                    marker: { colors: themeConfig.colors },
                    hoverinfo: "label+value"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 10, b: 10, l: 10, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>

          {/* VM Status Ratio */}
          <Card className="p-4 flex flex-col justify-between h-[300px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Workload Status Ratio
            </h3>
            <div className="flex-1 min-h-[220px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: ["RUNNING", "STOPPED"],
                    values: [runningVmsCount, stoppedVmsCount],
                    textinfo: "value+percent",
                    marker: { colors: [themeConfig.colors[0], "#94a3b8"] },
                    hoverinfo: "label+value"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 10, b: 10, l: 10, r: 10 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
