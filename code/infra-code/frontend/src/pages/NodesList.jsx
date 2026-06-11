import React, { useEffect, useState } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Server, Cpu, Layers, HardDrive } from "lucide-react";

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

export default function NodesList() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  if (loading) {
    return (
      <PageContainer title="Nodes Status">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Fetching node details..." />
        </div>
      </PageContainer>
    );
  }

  // Calculate stats
  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter((n) => n.live_status).length;
  const totalCores = nodes.reduce((acc, curr) => acc + (curr.total_cores || 0), 0);
  const totalMem = nodes.reduce((acc, curr) => acc + (curr.total_mem || 0), 0);

  return (
    <PageContainer 
      title="Nodes Status" 
      description="Real-time configuration, hardware profiles, and operation statuses of hypervisor cluster nodes."
      actions={
        <button 
          onClick={fetchNodes} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
        >
          Refresh
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
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Server size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nodes Info</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {onlineNodes} <span className="text-sm text-slate-500 font-medium">/ {totalNodes} Online</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Cpu size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total CPU Cores</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalCores} <span className="text-sm text-slate-500 font-medium">Cores</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Memory</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {formatBytes(totalMem)}
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Clusters</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {nodes[0]?.cluster_name || "VSSC Cluster"}
            </div>
          </div>
        </Card>
      </div>

      {/* Nodes Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <table className="w-full border-collapse text-left text-sm bg-white dark:bg-slate-900/40">
          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-4 font-semibold">Node Name</th>
              <th className="px-5 py-4 font-semibold">Cluster</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">IP Address</th>
              <th className="px-5 py-4 font-semibold">Uptime</th>
              <th className="px-5 py-4 font-semibold">Cores</th>
              <th className="px-5 py-4 font-semibold">RAM Allocation</th>
              <th className="px-5 py-4 font-semibold">Hypervisor</th>
              <th className="px-5 py-4 font-semibold">Processor Model</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {nodes.map((node) => (
              <tr 
                key={node.node_name} 
                className="transition hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300"
              >
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-50">{node.node_name}</td>
                <td className="px-5 py-4">{node.cluster_name || "N/A"}</td>
                <td className="px-5 py-4">
                  <Badge variant={node.live_status ? "success" : "danger"}>
                    {node.live_status ? "online" : "offline"}
                  </Badge>
                </td>
                <td className="px-5 py-4 font-mono text-xs">{node.ip || "N/A"}</td>
                <td className="px-5 py-4 font-mono text-xs">{formatUptime(node.uptime)}</td>
                <td className="px-5 py-4 text-center font-semibold">{node.total_cores}</td>
                <td className="px-5 py-4 font-mono text-xs">{formatBytes(node.total_mem)}</td>
                <td className="px-5 py-4 font-mono text-xs">{node.hypervisor || "N/A"}</td>
                <td className="px-5 py-4 text-xs max-w-[200px] truncate" title={node.model}>
                  {node.model || "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
