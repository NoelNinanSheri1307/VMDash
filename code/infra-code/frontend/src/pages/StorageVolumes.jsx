import React, { useEffect, useState, useMemo } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Plot from "react-plotly.js";
import { useTheme } from "../theme/ThemeProvider";
import { HardDrive, Server, Info, Search, ArrowUpDown, ShieldCheck, ShieldAlert } from "lucide-react";

// Format size from GB to appropriate label
const formatGB = (gb) => {
  if (!gb) return "0 GB";
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
};

// Parse VM disk image sizes (e.g. "32G", "100G", "cdrom") to numbers in GB
const parseStorageSizeToGB = (sizeStr) => {
  if (!sizeStr) return 0;
  const s = sizeStr.toString().trim().toLowerCase();
  if (s === "cdrom") return 0;
  
  const match = s.match(/^([\d.]+)\s*([tgmk]?)/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  if (unit === "t") return value * 1024;
  if (unit === "g") return value;
  if (unit === "m") return value / 1024;
  if (unit === "k") return value / (1024 * 1024);
  return value;
};

// Plotly Theme helper
const getPlotlyTheme = (role, theme) => {
  const isDark = theme === "dark";
  const primaryColor = role === "manager" ? "#10b981" : "#3b82f6";
  const colors = role === "manager"
    ? ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"]
    : ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

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
      margin: { t: 30, b: 35, l: 40, r: 15 },
      xaxis: {
        gridcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        linecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      },
      yaxis: {
        gridcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        linecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      }
    }
  };
};

export default function StorageVolumes() {
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

  const [storages, setStorages] = useState([]);
  const [allocationMap, setAllocationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("storage_name");
  const [sortDirection, setSortDirection] = useState("asc");

  const themeConfig = useMemo(() => getPlotlyTheme(role, currentTheme), [role, currentTheme]);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      
      // Fetch storage pools — primary request
      const storageRes = await proxmoxApi.get("/proxmox/storage/");
      setStorages(storageRes.data || []);
      setError("");

      // Fetch VM storage allocation via Report API (best-effort — non-blocking)
      try {
        const reportRes = await proxmoxApi.post("/proxmox/report", {
          format: "json",
          columns: ["vm_uuid", "vm_name", "cluster_name", "node_name", "storages"]
        });

        const alloc = {};
        const vmsList = Array.isArray(reportRes.data)
          ? reportRes.data
          : (reportRes.data && Array.isArray(reportRes.data.data) ? reportRes.data.data : []);

        vmsList.forEach((vm) => {
          if (vm.storages && Array.isArray(vm.storages)) {
            vm.storages.forEach((st) => {
              const key = `${vm.cluster_name}|${vm.node_name}|${st.storage_name}`;
              const sizeGB = parseStorageSizeToGB(st.size);
              alloc[key] = (alloc[key] || 0) + sizeGB;
            });
          }
        });

        setAllocationMap(alloc);
      } catch (reportErr) {
        console.warn("VM report API unavailable – allocation data will not be shown:", reportErr);
        // Allocation map stays empty — storage pools still render without utilization bars
      }

    } catch (err) {
      console.error("Failed to load storage volumes information:", err);
      setError("Unable to communicate with the storage backend. Please ensure the Proxmox service is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
    const params = new URLSearchParams(window.location.search);
    const poolParam = params.get("pool");
    if (poolParam) {
      setSearchTerm(poolParam);
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

  // Compile full storage items with derived used size
  const fullStorages = useMemo(() => {
    return storages.map((st) => {
      const key = `${st.cluster_name}|${st.node_name}|${st.storage_name}`;
      const allocatedSize = allocationMap[key] || 0;
      const totalSize = st.total_size || 0;
      const usagePercent = totalSize > 0 ? (allocatedSize / totalSize) * 100 : 0;
      
      return {
        ...st,
        allocatedSize,
        usagePercent
      };
    });
  }, [storages, allocationMap]);

  // Filter & Sort table
  const filteredAndSortedStorages = useMemo(() => {
    let result = fullStorages.filter((st) => {
      const search = searchTerm.toLowerCase();
      return (
        st.storage_name?.toLowerCase().includes(search) ||
        st.node_name?.toLowerCase().includes(search) ||
        st.cluster_name?.toLowerCase().includes(search) ||
        st.storage_type?.toLowerCase().includes(search) ||
        st.storage_server_ip?.toLowerCase().includes(search)
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
  }, [fullStorages, searchTerm, sortField, sortDirection]);

  if (loading) {
    return (
      <PageContainer title="Storage Volumes">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading storage configurations..." />
        </div>
      </PageContainer>
    );
  }

  // Summary counts
  const totalPoolsCount = storages.length;
  const onlinePoolsCount = storages.filter((s) => s.live_status).length;
  const offlinePoolsCount = totalPoolsCount - onlinePoolsCount;
  const totalCapacityGb = storages.reduce((acc, curr) => acc + (curr.total_size || 0), 0);

  // Chart aggregation maps
  const typeCounts = {};
  let activeCount = 0;
  let inactiveCount = 0;
  const storageNames = [];
  const capacities = [];

  fullStorages.forEach((st) => {
    // Type
    const type = st.storage_type || "local";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Status
    if (st.live_status) activeCount++;
    else inactiveCount++;

    // Capacities
    storageNames.push(`${st.storage_name} (${st.node_name})`);
    capacities.push(st.total_size || 0);
  });

  return (
    <PageContainer
      title="Storage Volumes"
      description="Active datastores, LVM volumes, NFS shares, and directory-based local storage mapped per node."
      actions={
        <button
          onClick={fetchStorageData}
          className="px-4 py-2 bg-role-primary hover:bg-role-primary-hover text-white rounded-xl text-sm font-semibold transition"
        >
          Refresh Storage
        </button>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Pools */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-role-primary-light text-role-primary rounded-xl shrink-0">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Storage Pools</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalPoolsCount} Pools</div>
          </div>
        </Card>

        {/* Online Pools */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Online Pools</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{onlinePoolsCount} Pools</div>
          </div>
        </Card>

        {/* Offline Pools */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-xl shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Offline Pools</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{offlinePoolsCount} Pools</div>
          </div>
        </Card>

        {/* Combined Capacity */}
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Info size={22} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Combined Capacity</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{formatGB(totalCapacityGb)}</div>
          </div>
        </Card>
      </div>

      {/* Inventory & Search Panel */}
      <Card className="p-0 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2">
          <Search className="text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search storage by name, cluster, type, host ip..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm bg-white dark:bg-slate-900/40">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort("storage_name")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Storage Name <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("node_name")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Node <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("storage_type")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Type <ArrowUpDown size={14} /></div>
                </th>
                <th
                  onClick={() => handleSort("live_status")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Status <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-5 py-4 font-semibold">IP Address</th>
                <th className="px-5 py-4 font-semibold">Datastore</th>
                <th
                  onClick={() => handleSort("total_size")}
                  className="px-5 py-4 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1">Limit Capacity <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-5 py-4 font-semibold min-w-[150px]">Allocation Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAndSortedStorages.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500 bg-white dark:bg-slate-900/10">
                    No matching storage pools found.
                  </td>
                </tr>
              ) : (
                filteredAndSortedStorages.map((storage, idx) => {
                  const percent = Math.min(storage.usagePercent, 100);
                  const displayPercent = storage.usagePercent.toFixed(1);
                  
                  return (
                    <tr
                      key={idx}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300"
                    >
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-50">{storage.storage_name}</td>
                      <td className="px-5 py-4 font-semibold">
                        {storage.node_name} <span className="text-xs text-slate-400 font-normal">({storage.cluster_name})</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs uppercase">{storage.storage_type}</td>
                      <td className="px-5 py-4">
                        <Badge variant={storage.live_status ? "success" : "danger"}>
                          {storage.live_status ? "active" : "inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{storage.storage_server_ip || "local"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{storage.storage_datastore || "-"}</td>
                      <td className="px-5 py-4 font-bold font-mono text-xs">{formatGB(storage.total_size)}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div
                              className="bg-role-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                            <span>{formatGB(storage.allocatedSize)}</span>
                            <span>{displayPercent}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Analytics Charts */}
      {storages.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Storage Types */}
          <Card className="p-4 flex flex-col justify-between h-[320px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Storage Type Distribution
            </h3>
            <div className="flex-1 min-h-[240px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: Object.keys(typeCounts).map((t) => t.toUpperCase()),
                    values: Object.values(typeCounts),
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

          {/* Status Ratio */}
          <Card className="p-4 flex flex-col justify-between h-[320px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Storage Status Ratio
            </h3>
            <div className="flex-1 min-h-[240px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "pie",
                    hole: 0.5,
                    labels: ["ACTIVE", "INACTIVE"],
                    values: [activeCount, inactiveCount],
                    textinfo: "value+percent",
                    marker: { colors: [themeConfig.colors[0], "#ef4444"] },
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

          {/* Capacity comparisons */}
          <Card className="p-4 flex flex-col justify-between h-[320px]">
            <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Capacity Comparison (GB)
            </h3>
            <div className="flex-1 min-h-[240px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: storageNames,
                    y: capacities,
                    marker: { color: themeConfig.primaryColor }
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 15, b: 35, l: 40, r: 15 }
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
