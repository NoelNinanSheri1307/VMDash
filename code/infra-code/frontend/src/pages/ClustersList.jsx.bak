import React, { useEffect, useState } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Layers, CheckCircle2 } from "lucide-react";

export default function ClustersList() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const res = await proxmoxApi.get("/proxmox/cluster/");
      setClusters(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch cluster details:", err);
      setError("Unable to communicate with the clusters API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Clusters List">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading clusters..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="Clusters List" 
      description="Active virtualization environments and unified management groupings of compute nodes."
      actions={
        <button 
          onClick={fetchClusters} 
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

      {clusters.length === 0 ? (
        <Card className="text-center py-10 text-slate-500">
          No clusters found or database is empty. Proactively sync the hypervisor to load cluster settings.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster, idx) => (
            <Card key={idx} className="flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-24 w-24 bg-blue-500/10 rounded-bl-full flex items-center justify-end p-4 transition-all duration-300 group-hover:scale-110">
                <Layers className="text-blue-500 dark:text-blue-400" size={30} />
              </div>
              
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Hypervisor Cluster</span>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate pr-14">
                  {cluster.cluster_name}
                </h3>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Connection Status</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={16} /> Connected
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Sync Validation</span>
                <Badge variant="success">synchronized</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
