import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { useNavigate } from "react-router-dom";
import webApi from "../api/webapi";
import proxmoxApi from "../api/proxmoxapi";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useTheme } from "../theme/ThemeProvider";
import { motion } from "framer-motion";
import AnalyticsDrawer from "../components/AnalyticsDrawer";
import ReportPopup from "../components/ReportPopup";
import { X, Info } from "lucide-react";
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

const ALL_REPORT_FIELDS = [
  { key: "vm_name",              label: "VM Name" },
  { key: "vm_uuid",              label: "UUID" },
  { key: "os",                   label: "OS" },
  { key: "status",               label: "Status" },
  { key: "live_status",          label: "Live Status" },
  { key: "uptime",               label: "Uptime" },
  { key: "cpus",                 label: "CPUs" },
  { key: "max_memory",           label: "RAM (GB)" },
  { key: "max_disk",             label: "Disk (GB)" },
  { key: "cluster_name",         label: "Cluster" },
  { key: "node_name",            label: "Node" },
  { key: "ip",                   label: "IP Address" },
  { key: "mac",                  label: "MAC Address" },
  { key: "gpu",                  label: "GPU" },
  { key: "gpu_info",             label: "GPU Details" },
  { key: "created_date",         label: "Created Date" },
  { key: "users_assigned",       label: "Users Assigned" },
  { key: "com_focal_point",      label: "COM Focal Point" },
  { key: "end_user_focal_point", label: "End User Focal Point" },
  { key: "prometheus_status",    label: "Prometheus Status" },
  { key: "software_installed",   label: "Software Installed" },
  { key: "request_source",       label: "Request Source" },
  { key: "storages",             label: "Storage Pools" },
];

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

  // Analytics Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerType, setDrawerType] = useState("vm");
  const [drawerRecords, setDrawerRecords] = useState([]);

  // Report Popup states
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(["vm_name", "os", "status", "cluster_name", "node_name", "cpus", "max_memory", "max_disk"]);
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

  // Active Cross Filters (Multi-select)
  const [activeFilters, setActiveFilters] = useState({
    os: [],
    status: [],
    cluster: [],
    node: [],
    entity: [],
    division: [],
    groupname: []
  });

  // Sync activeFilters to URL search query and localStorage
  useEffect(() => {
    if (role === "user") return;
    
    const isEmpty = Object.values(activeFilters).every(arr => arr.length === 0);
    
    if (isEmpty) {
      localStorage.removeItem("vmdash_dashboard_filters");
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      localStorage.setItem("vmdash_dashboard_filters", JSON.stringify(activeFilters));
      
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, values]) => {
        values.forEach(v => params.append(key, v));
      });
      window.history.replaceState(null, "", "?" + params.toString());
    }
  }, [activeFilters, role]);

  // Load initial filters on mount from URL parameters, fallback to localStorage
  useEffect(() => {
    if (role === "user") return;
    
    const params = new URLSearchParams(window.location.search);
    const initial = {
      os: params.getAll("os"),
      status: params.getAll("status"),
      cluster: params.getAll("cluster"),
      node: params.getAll("node"),
      entity: params.getAll("entity"),
      division: params.getAll("division"),
      groupname: params.getAll("groupname")
    };
    
    const hasUrlParams = Object.values(initial).some(arr => arr.length > 0);
    
    if (hasUrlParams) {
      setActiveFilters(initial);
    } else {
      const saved = localStorage.getItem("vmdash_dashboard_filters");
      if (saved) {
        try {
          setActiveFilters(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing saved filters:", e);
        }
      }
    }
  }, [role]);

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

  const { vms = [], nodes = [], clusters = [], storage = [], webVms = [] } = adminData || {};

  // Unified VM and database ownership mapping
  const mergedVms = useMemo(() => {
    const ownershipMap = {};
    webVms.forEach(wv => {
      if (wv.vm_uuid) {
        ownershipMap[wv.vm_uuid] = wv.users || [];
      } else if (wv.vm_name) {
        ownershipMap[wv.vm_name.toLowerCase()] = wv.users || [];
      }
    });

    return vms.map(v => {
      const matchName = (v.vm_name || "").toLowerCase();
      const users = ownershipMap[v.vm_uuid] || ownershipMap[matchName] || [];
      return {
        ...v,
        vm_name: v.vm_name,
        vm_uuid: v.vm_uuid,
        os: v.os || "Unknown",
        status: (v.status || "stopped").toLowerCase(),
        cpus: Number(v.vm_cpu || v.cpus || 0),
        max_memory: Number(v.vm_max_mem || v.max_memory || 0),
        max_disk: Number(v.vm_max_disk || v.max_disk || 0),
        cluster_name: v.cluster_name || "Standalone",
        node_name: v.node_name || "Unknown Node",
        gpu: !!v.gpu,
        users,
        isAssigned: users.length > 0
      };
    });
  }, [vms, webVms]);

  // Apply AND-based filters (Change 6)
  const filteredVms = useMemo(() => {
    return mergedVms.filter(v => {
      if (activeFilters.os.length > 0 && !activeFilters.os.includes(v.os.toLowerCase())) return false;
      if (activeFilters.status.length > 0 && !activeFilters.status.includes(v.status.toLowerCase())) return false;
      if (activeFilters.cluster.length > 0 && !activeFilters.cluster.includes(v.cluster_name.toLowerCase())) return false;
      if (activeFilters.node.length > 0 && !activeFilters.node.includes(v.node_name.toLowerCase())) return false;

      if (activeFilters.entity.length > 0) {
        const hasMatch = v.users.some(u => activeFilters.entity.includes((u.entity || "Unassigned").toLowerCase())) ||
                         (activeFilters.entity.includes("unassigned") && !v.isAssigned);
        if (!hasMatch) return false;
      }
      if (activeFilters.division.length > 0) {
        const hasMatch = v.users.some(u => activeFilters.division.includes((u.division || "Unassigned").toLowerCase())) ||
                         (activeFilters.division.includes("unassigned") && !v.isAssigned);
        if (!hasMatch) return false;
      }
      if (activeFilters.groupname.length > 0) {
        const hasMatch = v.users.some(u => activeFilters.groupname.includes((u.groupname || "Unassigned").toLowerCase())) ||
                         (activeFilters.groupname.includes("unassigned") && !v.isAssigned);
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [mergedVms, activeFilters]);

  // Dynamic Metrics calculations (Change 7)
  const totalVmsCount = filteredVms.length;
  const runningVmsCount = filteredVms.filter((v) => v.status === "running").length;
  const stoppedVmsCount = filteredVms.filter((v) => v.status === "stopped").length;
  const totalNodesCount = nodes.length;
  const totalClustersCount = clusters.length;
  const totalStoragePoolsCount = storage.length;

  // Allocated Resources Summary
  const totalAllocatedCpu = filteredVms.reduce((acc, curr) => acc + curr.cpus, 0);
  const totalAllocatedRam = filteredVms.reduce((acc, curr) => acc + curr.max_memory, 0);
  const totalAllocatedDisk = filteredVms.reduce((acc, curr) => acc + curr.max_disk, 0);

  // System Health logs
  const offlineNodes = nodes.filter((n) => !n.live_status);
  const offlineStorage = storage.filter((s) => !s.live_status);
  const healthy = offlineNodes.length === 0 && offlineStorage.length === 0;

  // OS, Node, Cluster, and Corporate Ownership distribution counts calculated dynamically (Change 3)
  const {
    entityCounts,
    divisionCounts,
    groupCounts,
    osCounts,
    vmClusterCounts,
    vmNodeCounts
  } = useMemo(() => {
    const entities = {};
    const divisions = {};
    const groups = {};
    const oses = {};
    const clss = {};
    const nds = {};

    filteredVms.forEach(vm => {
      // OS
      oses[vm.os] = (oses[vm.os] || 0) + 1;
      // Cluster
      clss[vm.cluster_name] = (clss[vm.cluster_name] || 0) + 1;
      // Node
      nds[vm.node_name] = (nds[vm.node_name] || 0) + 1;

      // Corporate Ownership
      if (vm.users && vm.users.length > 0) {
        vm.users.forEach(u => {
          const ent = u.entity || "Unassigned";
          const div = u.division || "Unassigned";
          const grp = u.groupname || "Unassigned";

          entities[ent] = (entities[ent] || 0) + 1;
          divisions[div] = (divisions[div] || 0) + 1;
          groups[grp] = (groups[grp] || 0) + 1;
        });
      } else {
        entities["Unassigned"] = (entities["Unassigned"] || 0) + 1;
        divisions["Unassigned"] = (divisions["Unassigned"] || 0) + 1;
        groups["Unassigned"] = (groups["Unassigned"] || 0) + 1;
      }
    });

    return {
      entityCounts: entities,
      divisionCounts: divisions,
      groupCounts: groups,
      osCounts: oses,
      vmClusterCounts: clss,
      vmNodeCounts: nds
    };
  }, [filteredVms]);

  // Chart cross-filter onClick handlers
  const handleChartClick = (category, value) => {
    if (!value) return;
    const val = String(value).toLowerCase().trim();
    setActiveFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(val) 
        ? current.filter(x => x !== val) 
        : [...current, val];
      return { ...prev, [category]: updated };
    });
  };

  const removeFilterBadge = (category, value) => {
    const val = String(value).toLowerCase().trim();
    setActiveFilters(prev => {
      const current = prev[category] || [];
      return { ...prev, [category]: current.filter(x => x !== val) };
    });
  };

  const handleResetDashboard = () => {
    setActiveFilters({
      os: [],
      status: [],
      cluster: [],
      node: [],
      entity: [],
      division: [],
      groupname: []
    });
  };

  // Compile Active Filters list
  const activeBadgeElements = useMemo(() => {
    const badges = [];
    Object.entries(activeFilters).forEach(([category, values]) => {
      values.forEach(val => {
        badges.push({ category, value: val });
      });
    });
    return badges;
  }, [activeFilters]);

  // Utility to map Sunburst (Cluster -> Node -> VM) data hierarchy (Change 6)
  const sunburstData = useMemo(() => {
    const ids = ["Infrastructure"];
    const labels = ["Infrastructure"];
    const parents = [""];

    const clss = new Set();
    const nds = new Map();
    const vList = [];

    filteredVms.forEach(v => {
      const c = v.cluster_name || "Standalone";
      const n = v.node_name || "Unknown Node";
      clss.add(c);
      nds.set(n, c);
      vList.push({ id: `Infrastructure/${c}/${n}/${v.vm_name}`, name: v.vm_name, parent: `Infrastructure/${c}/${n}` });
    });

    clss.forEach(c => {
      ids.push(`Infrastructure/${c}`);
      labels.push(c);
      parents.push("Infrastructure");
    });

    nds.forEach((c, n) => {
      ids.push(`Infrastructure/${c}/${n}`);
      labels.push(n);
      parents.push(`Infrastructure/${c}`);
    });

    vList.forEach(v => {
      ids.push(v.id);
      labels.push(v.name);
      parents.push(v.parent);
    });

    return { ids, labels, parents };
  }, [filteredVms]);

  // Utility to map Treemap (Entity -> Division -> Group -> VM Name) hierarchy (Change 6 & 9)
  const treemapData = useMemo(() => {
    const ids = ["VSSC"];
    const labels = ["VSSC"];
    const parents = [""];

    const ents = new Set();
    const divs = new Map();
    const grps = new Map();
    const vList = [];

    filteredVms.forEach(v => {
      if (v.users && v.users.length > 0) {
        v.users.forEach(u => {
          const ent = u.entity || "Unassigned";
          const div = u.division || "Unassigned";
          const grp = u.groupname || "Unassigned";

          ents.add(ent);
          divs.set(`VSSC/${ent}/${div}`, `VSSC/${ent}`);
          grps.set(`VSSC/${ent}/${div}/${grp}`, `VSSC/${ent}/${div}`);
          vList.push({ id: `VSSC/${ent}/${div}/${grp}/${v.vm_name}`, name: v.vm_name, parent: `VSSC/${ent}/${div}/${grp}` });
        });
      } else {
        const ent = "Unassigned";
        const div = "Unassigned";
        const grp = "Unassigned";

        ents.add(ent);
        divs.set(`VSSC/${ent}/${div}`, `VSSC/${ent}`);
        grps.set(`VSSC/${ent}/${div}/${grp}`, `VSSC/${ent}/${div}`);
        vList.push({ id: `VSSC/${ent}/${div}/${grp}/${v.vm_name}`, name: v.vm_name, parent: `VSSC/${ent}/${div}/${grp}` });
      }
    });

    ents.forEach(ent => {
      ids.push(`VSSC/${ent}`);
      labels.push(ent);
      parents.push("VSSC");
    });

    divs.forEach((parent, div) => {
      ids.push(div);
      labels.push(div.split("/").pop());
      parents.push(parent);
    });

    grps.forEach((parent, grp) => {
      ids.push(grp);
      labels.push(grp.split("/").pop());
      parents.push(parent);
    });

    vList.forEach(v => {
      ids.push(v.id);
      labels.push(v.name);
      parents.push(v.parent);
    });

    return { ids, labels, parents };
  }, [filteredVms]);

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


  const handlePlotlyClick = (data, chartType) => {
    if (!data || !data.points || !data.points[0]) return;
    const pt = data.points[0];
    const id = pt.id || pt.label;
    if (!id || id === "Infrastructure" || id === "VSSC") return;

    // Check if VM leaf node
    if (id.includes("/") && id.split("/").length > 3) {
      const parts = id.split("/");
      const vmName = parts[parts.length - 1];
      const match = mergedVms.find(v => (v.vm_name || "").toLowerCase() === vmName.toLowerCase());
      if (match) {
        setDrawerType("vm");
        setDrawerRecords([match]);
        setDrawerTitle(`VM: ${match.vm_name}`);
        setDrawerOpen(true);
        return;
      }
    }

    // Toggle category filters based on clicked path
    if (chartType === "sunburst") {
      const parts = id.split("/");
      // Infrastructure/Cluster/Node
      if (parts.length === 2) {
        handleChartClick("cluster", parts[1]);
      } else if (parts.length === 3) {
        handleChartClick("node", parts[2]);
      }
    } else if (chartType === "treemap") {
      const parts = id.split("/");
      // VSSC/Entity/Division/Group
      if (parts.length === 2) {
        handleChartClick("entity", parts[1]);
      } else if (parts.length === 3) {
        handleChartClick("division", parts[2]);
      } else if (parts.length === 4) {
        handleChartClick("groupname", parts[3]);
      }
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedFormat) {
      alert("Please select a format.");
      return;
    }
    if (!selectedColumns.length) {
      alert("Please select at least one column.");
      return;
    }
    const filteredUuids = filteredVms.map(v => v.vm_uuid).filter(Boolean);
    if (!filteredUuids.length) {
      alert("No VMs match the current filters.");
      return;
    }
    try {
      setExporting(true);
      const isJson = selectedFormat === "json";
      const res = await proxmoxApi.post(
        "/proxmox/report",
        {
          columns: selectedColumns,
          format: selectedFormat,
          uuids: filteredUuids,
          staff_code: staffCode,
          report_name: "Dashboard Scope Export",
          report_type: "custom",
          filters: {
            os: activeFilters.os,
            status: activeFilters.status,
            cluster: activeFilters.cluster,
            node: activeFilters.node,
            entity: activeFilters.entity,
            division: activeFilters.division,
            groupname: activeFilters.groupname
          }
        },
        { responseType: isJson ? "json" : "blob" }
      );
      if (selectedFormat === "pdf") {
        const rawText = res.data instanceof Blob
          ? await res.data.text()
          : typeof res.data === "string"
          ? res.data
          : JSON.stringify(res.data);
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(rawText);
          win.document.close();
        } else {
          const blob = new Blob([rawText], { type: "text/html" });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a");
          a.href     = url;
          a.download = "dashboard-export.html";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (isJson) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob    = new Blob([jsonStr], { type: "application/json" });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement("a");
        a.href        = url;
        a.download    = "dashboard-export.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const mimeTypes = { csv: "text/csv", xls: "application/vnd.ms-excel" };
        const mimeType  = mimeTypes[selectedFormat] || "application/octet-stream";
        const blob = new Blob([res.data], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `dashboard-export.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setShowExportPopup(false);
    } catch (err) {
      console.error("Export failed:", err);
      const msg = err.response?.data?.error || err.message || "Export failed. Please try again.";
      alert(msg);
    } finally {
      setExporting(false);
    }
  };

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

        <div className="flex items-center gap-3">
          {filteredVms.length > 0 && (
            <button
              onClick={() => setShowExportPopup(true)}
              className="btn-premium-success flex items-center gap-1.5"
            >
              Quick Export
            </button>
          )}
          <button
            onClick={fetchAdminDashboard}
            className="btn-premium-role"
          >
            Refresh Live Metrics
          </button>
        </div>
      </div>

      {/* Filters Scope Banner (Change 7 & 8) */}
      {activeBadgeElements.length > 0 && (
        <div className="bg-blue-50/50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Active Filters:</span>
            {activeBadgeElements.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-role-primary-light text-role-primary border border-role-primary-border/40 font-mono"
              >
                <span className="opacity-70 capitalize">{badge.category}:</span>
                <span className="font-bold">{badge.value.toUpperCase()}</span>
                <button
                  onClick={() => removeFilterBadge(badge.category, badge.value)}
                  className="hover:text-red-500 transition-colors focus:outline-none"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              {filteredVms.length} / {mergedVms.length} VMs matching
            </span>
            <button
              onClick={handleResetDashboard}
              className="px-4 py-1.5 bg-red-100 hover:bg-red-200/80 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200/50 dark:border-red-900/40 transition"
            >
              Reset Dashboard
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SECTION A — KPI Header (Clickable & Interactive, Change 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total VMs */}
        <Card
          onClick={() => {
            setDrawerType("vm");
            setDrawerRecords(filteredVms);
            setDrawerTitle("Operations Inventory: All Filtered VMs");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 border-l-4 border-l-role-primary cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
        >
          <div className="p-2.5 bg-role-primary-light text-role-primary rounded-xl shrink-0 group-hover:scale-105 transition-transform">
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
        <Card
          onClick={() => {
            setDrawerType("vm");
            setDrawerRecords(filteredVms.filter(v => v.status === "running"));
            setDrawerTitle("Live Environment: Running VMs");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
        >
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
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
        <Card
          onClick={() => {
            setDrawerType("vm");
            setDrawerRecords(filteredVms.filter(v => v.status === "stopped"));
            setDrawerTitle("Off/Stalled State: Stopped VMs");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
        >
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
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
        <Card
          onClick={() => {
            setDrawerType("node");
            setDrawerRecords(nodes);
            setDrawerTitle("Hypervisor Nodes Inventory");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
        >
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
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
        <Card
          onClick={() => {
            setDrawerType("cluster");
            setDrawerRecords(clusters);
            setDrawerTitle("Virtualization Clusters Inventory");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
        >
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
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
        <Card
          onClick={() => {
            setDrawerType("storage");
            setDrawerRecords(storage);
            setDrawerTitle("Enterprise Storage Pools");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 border-l-4 border-l-sky-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
        >
          <div className="p-2.5 bg-sky-100 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
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
            <Badge
              variant={offlineNodes.length === 0 ? "success" : "danger"}
              className={offlineNodes.length > 0 ? "cursor-pointer hover:opacity-80" : ""}
              onClick={() => {
                if (offlineNodes.length > 0) {
                  setDrawerType("node");
                  setDrawerRecords(offlineNodes);
                  setDrawerTitle("System Alert: Offline Nodes");
                  setDrawerOpen(true);
                }
              }}
            >
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
                  onClick={() => {
                    setDrawerType("node");
                    setDrawerRecords([node]);
                    setDrawerTitle(`Hypervisor Node: ${node.node_name}`);
                    setDrawerOpen(true);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs hover:bg-slate-100/55 dark:hover:bg-slate-800/80 transition cursor-pointer"
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
            <Badge
              variant={offlineStorage.length === 0 ? "success" : "danger"}
              className={offlineStorage.length > 0 ? "cursor-pointer hover:opacity-80" : ""}
              onClick={() => {
                if (offlineStorage.length > 0) {
                  setDrawerType("storage");
                  setDrawerRecords(offlineStorage);
                  setDrawerTitle("System Alert: Offline Storage Pools");
                  setDrawerOpen(true);
                }
              }}
            >
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
                  onClick={() => {
                    setDrawerType("storage");
                    setDrawerRecords([st]);
                    setDrawerTitle(`Storage Volume Pool: ${st.storage_name}`);
                    setDrawerOpen(true);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs hover:bg-slate-100/55 dark:hover:bg-slate-800/80 transition cursor-pointer"
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

      {/* System Warning Banner for Offline Assets (Clickable Alert, Change 1) */}
      {!healthy && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            setDrawerType("node");
            setDrawerRecords(offlineNodes);
            setDrawerTitle("Offline Hypervisors Alert Group");
            setDrawerOpen(true);
          }}
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 rounded-xl text-sm cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-950/30 transition shadow-sm"
        >
          <AlertTriangle className="shrink-0" size={20} />
          <div className="flex-1">
            <span className="font-bold">Operational Alert:</span> Some hypervisor nodes or storage systems are currently
            offline or unreachable. Click to view offline assets.
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
            Ownership metrics mapped strictly from active VM to staff database relationships. Click slices or bars to cross-filter.
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
                onClick={(data) => handleChartClick("entity", data?.points?.[0]?.label)}
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
                onClick={(data) => handleChartClick("division", data?.points?.[0]?.x)}
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
                onClick={(data) => handleChartClick("groupname", data?.points?.[0]?.x)}
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

      {/* Hierarchical Intelligence Section (Change 6) */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="text-role-primary" size={18} /> Hierarchical Infrastructure & Ownership Maps
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Advanced multi-layered analysis. Click groups to drill down or click leaf VMs to open specifications instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sunburst Chart */}
          <Card className="p-4 flex flex-col justify-between h-[400px]">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
                <Network size={16} className="text-role-primary" /> Sunburst: Cluster ➔ Node ➔ VM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hierarchical hypervisor workspace. Zoom by clicking cluster/node rings; click VM to view details.
              </p>
            </div>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "sunburst",
                    ids: sunburstData.ids,
                    labels: sunburstData.labels,
                    parents: sunburstData.parents,
                    branchvalues: "total",
                    hoverinfo: "label+value",
                    marker: { line: { width: 0.5 }, colors: themeConfig.colors }
                  }
                ]}
                onClick={(data) => handlePlotlyClick(data, "sunburst")}
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

          {/* Treemap Chart */}
          <Card className="p-4 flex flex-col justify-between h-[400px]">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
                <Users size={16} className="text-role-primary" /> Treemap: Entity ➔ Division ➔ Group ➔ VM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hierarchical corporate ownership structure. Click boxes to zoom; VM leafs open details.
              </p>
            </div>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "treemap",
                    ids: treemapData.ids,
                    labels: treemapData.labels,
                    parents: treemapData.parents,
                    branchvalues: "total",
                    hoverinfo: "label+value",
                    marker: { line: { width: 0.5 }, colors: themeConfig.colors }
                  }
                ]}
                onClick={(data) => handlePlotlyClick(data, "treemap")}
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

      {/* SECTION E — Infrastructure Distribution */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="text-role-primary" size={18} /> Hypervisor Infrastructure Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Workload distribution, hypervisor configurations, and live operational stats. Click elements to cross-filter.
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
                onClick={(data) => handleChartClick("cluster", data?.points?.[0]?.label)}
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
                onClick={(data) => handleChartClick("node", data?.points?.[0]?.x)}
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
                onClick={(data) => handleChartClick("os", data?.points?.[0]?.label)}
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
                onClick={(data) => handleChartClick("status", data?.points?.[0]?.label)}
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

      {/* Analytics Drawer Component Overlay (Change 1 & 2) */}
      <AnalyticsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        type={drawerType}
        records={drawerRecords}
        allVms={mergedVms}
      />

      {/* Export Customize Popup */}
      {showExportPopup && (
        <ReportPopup
          availableColumns={ALL_REPORT_FIELDS}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          onClose={() => setShowExportPopup(false)}
          onDownload={handleDownloadReport}
        />
      )}
    </div>
  );
}
