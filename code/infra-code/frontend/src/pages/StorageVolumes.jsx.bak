import React, { useEffect, useState } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { HardDrive, Server, Info, ShieldAlert } from "lucide-react";

// Format size from GB to appropriate label
const formatGB = (gb) => {
  if (!gb) return "0 GB";
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
};

export default function StorageVolumes() {
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStorages = async () => {
    try {
      setLoading(true);
      const res = await proxmoxApi.get("/proxmox/storage/");
      setStorages(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch storage volumes:", err);
      setError("Unable to communicate with the storage backend API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorages();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Storage Volumes">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading storage configurations..." />
        </div>
      </PageContainer>
    );
  }

  // Calculate summary metrics
  const totalVolumeCount = storages.length;
  const activeVolumeCount = storages.filter((s) => s.live_status).length;
  const totalCapacityGb = storages.reduce((acc, curr) => acc + (curr.total_size || 0), 0);

  return (
    <PageContainer 
      title="Storage Volumes" 
      description="Active datastores, shared NFS servers, LVM volumes, and localized hard drives grouped by compute node."
      actions={
        <button 
          onClick={fetchStorages} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Datastores</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalVolumeCount} <span className="text-sm text-slate-500 font-medium">Mapped pools</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Server size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Volumes</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {activeVolumeCount} <span className="text-sm text-slate-500 font-medium">Online</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Info size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aggregate Capacity</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {formatGB(totalCapacityGb)}
            </div>
          </div>
        </Card>
      </div>

      {/* Storage Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <table className="w-full border-collapse text-left text-sm bg-white dark:bg-slate-900/40">
          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-4 font-semibold">Volume Name</th>
              <th className="px-5 py-4 font-semibold">Node Binding</th>
              <th className="px-5 py-4 font-semibold">Storage Type</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">IP Address</th>
              <th className="px-5 py-4 font-semibold">Datastore Target</th>
              <th className="px-5 py-4 font-semibold">Total Capacity</th>
              <th className="px-5 py-4 font-semibold">Content Types Allowed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {storages.map((storage, idx) => (
              <tr 
                key={idx} 
                className="transition hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300"
              >
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-50">{storage.storage_name}</td>
                <td className="px-5 py-4 text-xs font-semibold">{storage.node_name} <span className="text-slate-400">({storage.cluster_name})</span></td>
                <td className="px-5 py-4 capitalize font-mono text-xs">{storage.storage_type}</td>
                <td className="px-5 py-4">
                  <Badge variant={storage.live_status ? "success" : "danger"}>
                    {storage.live_status ? "active" : "inactive"}
                  </Badge>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {storage.storage_server_ip || "local"}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {storage.storage_datastore || "-"}
                </td>
                <td className="px-5 py-4 font-bold font-mono text-xs">{formatGB(storage.total_size)}</td>
                <td className="px-5 py-4 text-xs max-w-[200px] truncate" title={storage.content}>
                  {storage.content || "none"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
