import React, { useEffect, useState, useMemo } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Plot from "react-plotly.js";
import { useTheme } from "../theme/ThemeProvider";
import { Layers, CheckCircle2, XCircle, Server, Monitor, Cpu, HardDrive, Database, Search, Plus, Trash2 } from "lucide-react";

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
  const primaryColor = role === "manager" ? "#10b981" : "#3b82f6";

  return {
    primaryColor,
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

export default function ClustersList() {
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

  const [clusters, setClusters] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddClusterModal, setShowAddClusterModal] = useState(false);
  const [newClusterName, setNewClusterName] = useState("");
  const [newClusterIp, setNewClusterIp] = useState("");
  const [newClusterToken, setNewClusterToken] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSubmitAddCluster = async (e) => {
    e.preventDefault();
    if (!newClusterName || !newClusterIp || !newClusterToken) {
      setAddError("All fields are required.");
      return;
    }

    try {
      setAddLoading(true);
      setAddError("");
      await proxmoxApi.post("/cluster/add", {
        name: newClusterName,
        ip: newClusterIp,
        token: newClusterToken
      });
      
      await fetchClusterDashboard();
      setShowAddClusterModal(false);
      setNewClusterName("");
      setNewClusterIp("");
      setNewClusterToken("");
    } catch (err) {
      console.error("Failed to add cluster:", err);
      setAddError(
        err.response?.data?.error || 
        err.response?.data || 
        "Failed to add new cluster. Please check your inputs or try again."
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteCluster = (clusterName) => {
    setClusterToDelete(clusterName);
    setShowDeleteModal(true);
  };

  const confirmDeleteCluster = async () => {
    if (!clusterToDelete) return;

    try {
      setDeleteLoading(true);
      setError("");
      await proxmoxApi.delete(`/cluster/${clusterToDelete}/delete`);
      await fetchClusterDashboard();
      setShowDeleteModal(false);
      setClusterToDelete("");
    } catch (err) {
      console.error("Failed to delete cluster:", err);
      setError(
        err.response?.data?.error || 
        "Failed to delete the cluster. Please try again."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const themeConfig = useMemo(() => getPlotlyTheme(role, currentTheme), [role, currentTheme]);

  const fetchClusterDashboard = async () => {
    try {
      setLoading(true);
      const [clustersRes, nodesRes, vmsRes] = await Promise.all([
        proxmoxApi.get("/cluster/"),
        proxmoxApi.get("/nodes/"),
        proxmoxApi.get("/vms/vmData")
      ]);

      setClusters(clustersRes.data);
      setNodes(nodesRes.data);
      setVms(vmsRes.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch cluster dashboard data:", err);
      setError("Unable to communicate with the clusters or VM backend APIs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterDashboard();
    const params = new URLSearchParams(window.location.search);
    const clusterParam = params.get("cluster");
    if (clusterParam) {
      setSearchTerm(clusterParam);
    }
  }, []);

  // Compute Cluster Metrics
  const clusterData = useMemo(() => {
    return clusters.map((cluster) => {
      const clusterNodes = nodes.filter((n) => n.cluster_name === cluster.cluster_name);
      const clusterVms = vms.filter((v) => v.cluster_name === cluster.cluster_name);

      const nodeCount = clusterNodes.length;
      const vmCount = clusterVms.length;

      // Online status: online if at least one node is online
      const isOnline = clusterNodes.length > 0 ? clusterNodes.some((n) => n.live_status) : true;

      // Sum VM Allocations
      const allocatedCpu = clusterVms.reduce((acc, curr) => acc + (Number(curr.vm_cpu) || 0), 0);
      const allocatedRam = clusterVms.reduce((acc, curr) => acc + (Number(curr.vm_max_mem) || 0), 0);
      const allocatedDisk = clusterVms.reduce((acc, curr) => acc + (Number(curr.vm_max_disk) || 0), 0);

      return {
        ...cluster,
        nodeCount,
        vmCount,
        isOnline,
        allocatedCpu,
        allocatedRam,
        allocatedDisk
      };
    });
  }, [clusters, nodes, vms]);

  // Filter cluster data based on search input
  const filteredClusterData = useMemo(() => {
    if (!searchTerm) return clusterData;
    const query = searchTerm.toLowerCase().trim();
    return clusterData.filter((c) =>
      c.cluster_name?.toLowerCase().includes(query)
    );
  }, [clusterData, searchTerm]);

  if (loading) {
    return (
      <PageContainer title="Clusters List">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading clusters..." />
        </div>
      </PageContainer>
    );
  }

  // Chart values
  const clusterNames = clusterData.map((c) => c.cluster_name);
  const clusterVmCounts = clusterData.map((c) => c.vmCount);

  return (
    <PageContainer
      title="Clusters List"
      description="Active virtualization environments and unified management groupings of compute nodes."
      actions={
        <div className="flex gap-3">
          {(role === "admin" || role === "manager") && (
            <button
              onClick={() => setShowAddClusterModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <Plus size={16} /> Add Cluster
            </button>
          )}
          <button
            onClick={fetchClusterDashboard}
            className="px-4 py-2 bg-role-primary hover:bg-role-primary-hover text-white rounded-xl text-sm font-semibold transition"
          >
            Refresh Clusters
          </button>
        </div>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {clusterData.length === 0 ? (
        <Card className="text-center py-12 text-slate-500">
          No clusters found or database is empty. Proactively sync the hypervisor to load cluster settings.
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Search bar */}
          <Card className="p-0 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2">
              <Search className="text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search clusters by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="text-xs text-slate-400 hover:text-slate-600 transition">Clear</button>
              )}
            </div>
          </Card>

          {/* Cluster Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClusterData.map((cluster, idx) => (
              <Card key={idx} className="flex flex-col justify-between gap-5 relative overflow-hidden group border-t-4 border-t-role-primary">
                {/* Background watermarked icon */}
                <div className="absolute right-0 top-0 h-20 w-20 bg-role-primary bg-opacity-5 rounded-bl-full flex items-center justify-end p-3 transition-all duration-300 group-hover:scale-115">
                  <Layers className="text-role-primary" size={26} />
                </div>

                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-role-primary uppercase tracking-wider">
                      Virtualization Cluster
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 truncate pr-10">
                      {cluster.cluster_name}
                    </h3>
                  </div>
                  {(role === "admin" || role === "manager") && (
                    <button 
                      onClick={() => handleDeleteCluster(cluster.cluster_name)}
                      className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 z-10"
                      title="Delete Cluster"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <div className="text-slate-400 font-semibold uppercase text-[9px] tracking-wide">Nodes</div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{cluster.nodeCount} Units</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <div className="text-slate-400 font-semibold uppercase text-[9px] tracking-wide">VMs</div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{cluster.vmCount} Syncs</div>
                    </div>
                  </div>
                </div>

                {/* Resource aggregates */}
                <div className="space-y-2 text-xs">
                  <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Allocated Cluster Resources
                  </span>
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1"><Cpu size={12} /> Cores</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{cluster.allocatedCpu} Cores</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1"><HardDrive size={12} /> Memory</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{formatGB(cluster.allocatedRam)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1"><Database size={12} /> Storage</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{formatGB(cluster.allocatedDisk)}</span>
                    </div>
                  </div>
                </div>

                {/* Status elements */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500">Operation Status</span>
                  {cluster.isOnline ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 size={14} /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                      <XCircle size={14} /> Unreachable
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Cluster Chart Distribution */}
          <Card className="p-4 flex flex-col justify-between h-[380px] mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Workload Density (VM Count by Cluster)
              </h3>
              <Badge variant="info">Workloads</Badge>
            </div>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: clusterNames,
                    y: clusterVmCounts,
                    marker: { color: themeConfig.primaryColor },
                    text: clusterVmCounts.map((v) => `${v} VMs`),
                    textposition: "auto"
                  }
                ]}
                layout={{
                  ...themeConfig.layout,
                  autosize: true,
                  margin: { t: 15, b: 40, l: 40, r: 15 }
                }}
                useResizeHandler
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          </Card>
        </div>
      )}

      {showAddClusterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Add New Proxmox Cluster</h3>
              <button 
                onClick={() => {
                  setShowAddClusterModal(false);
                  setAddError("");
                  setNewClusterName("");
                  setNewClusterIp("");
                  setNewClusterToken("");
                }} 
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmitAddCluster} className="p-6 space-y-4">
              {addError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs">
                  {addError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cluster Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. cluster-1"
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-role-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cluster IP Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 10.41.10.173"
                  value={newClusterIp}
                  onChange={(e) => setNewClusterIp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-role-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proxmox API Token</label>
                <input 
                  type="text" 
                  required
                  placeholder="PVEAPIToken=user@pve!token=uuid"
                  value={newClusterToken}
                  onChange={(e) => setNewClusterToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-role-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  disabled={addLoading}
                  onClick={() => {
                    setShowAddClusterModal(false);
                    setAddError("");
                    setNewClusterName("");
                    setNewClusterIp("");
                    setNewClusterToken("");
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {addLoading ? "Adding..." : "Add Cluster"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Trash2 className="text-rose-500" size={18} /> Delete Cluster
              </h3>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setClusterToDelete("");
                }} 
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed">
                Are you sure you want to delete cluster <span className="font-bold text-slate-850 dark:text-slate-100">"{clusterToDelete}"</span>?
              </p>
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-3 rounded-xl">
                <p className="text-[10px] text-rose-700 dark:text-rose-400 leading-normal font-semibold">
                  Warning: This action is permanent and will automatically unlink all virtual machines and delete nodes linked to this cluster.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setClusterToDelete("");
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCluster}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
