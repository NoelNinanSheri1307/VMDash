import React, { useState, useEffect } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { 
  FileCheck, 
  Clock, 
  Bell, 
  AlertOctagon, 
  UserCheck, 
  Layers, 
  RefreshCw, 
  Check, 
  AlertTriangle 
} from "lucide-react";
import proxmoxApi from "../api/proxmoxapi";

export default function OperationsGovernance() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await proxmoxApi.get("/proxmox/governance/kpis");
      setMetrics(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load operations governance metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRunScan = async () => {
    setScanning(true);
    setActionError("");
    setSuccessMsg("");
    try {
      await proxmoxApi.post("/proxmox/alerts/refresh");
      await fetchMetrics();
      setSuccessMsg("Alert scanner check completed successfully.");
    } catch (err) {
      setActionError("Alert scan execution failed.");
    } finally {
      setScanning(false);
    }
  };

  const handleResolveAlert = async (id) => {
    setActionError("");
    setSuccessMsg("");
    try {
      await proxmoxApi.put(`/proxmox/alerts/${id}/resolve`);
      setSuccessMsg("Alert resolved successfully.");
      fetchMetrics();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to resolve alert.");
    }
  };

  if (loading && !metrics) {
    return (
      <PageContainer title="Operations Governance Center">
        <div className="text-center py-20 text-slate-400">Loading governance details...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Operations Governance Center"
      description="Monitor hypervisor allocation policies, request approvals, active alerts, and database integrity metrics."
      actions={
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition"
        >
          <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning..." : "Trigger Alert Scan"}
        </button>
      }
    >
      {error && <div className="mb-6 p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs">{error}</div>}

      {/* Success/Error Banners */}
      {successMsg && (
        <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-800 dark:text-emerald-400 flex items-center justify-between shadow-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-800 dark:text-emerald-400 hover:opacity-85 font-bold ml-4">✕</button>
        </div>
      )}
      {actionError && (
        <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-800 dark:text-rose-400 flex items-center justify-between shadow-sm">
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="text-rose-800 dark:text-rose-400 hover:opacity-85 font-bold ml-4">✕</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {/* KPI 1: Request Approval Rate % */}
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <FileCheck size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Request Approval Rate</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
              {metrics?.approval_rate}%
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Approved vs rejected requests</p>
          </div>
        </Card>

        {/* KPI 2: Average Approval Time */}
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Average Approval Time</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
              {metrics?.avg_approval_time_hours} hrs
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">From submission to response</p>
          </div>
        </Card>

        {/* KPI 3: Notification Backlog */}
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Bell size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notification Backlog</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
              {metrics?.notification_backlog}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Unread user notifications</p>
          </div>
        </Card>

        {/* KPI 4: Critical Alerts */}
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
            <AlertOctagon size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Critical Alerts</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
              {metrics?.critical_alerts_count}
            </div>
            <p className="text-[10px] text-rose-500 mt-0.5">Active hypervisor failures</p>
          </div>
        </Card>

        {/* KPI 5: Ownership Coverage % */}
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ownership Coverage</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              {metrics?.ownership_coverage_pct}%
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">VMs linked to focal points</p>
          </div>
        </Card>

        {/* KPI 6: Total Clusters (Dynamic) */}
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Layers size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Clusters</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5 font-mono font-black">
              {metrics?.total_clusters}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Registered Proxmox environments</p>
          </div>
        </Card>
      </div>

      {/* Alerts Logs Panel */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          Active Infrastructure Alerts
        </h3>
        
        {metrics?.active_alerts?.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">All environments running clear. No active alerts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Triggered At</th>
                  <th className="px-4 py-2.5 text-center">Resolve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-350">
                {metrics?.active_alerts?.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3">
                      <Badge variant={a.severity === "critical" ? "danger" : "warning"}>
                        {a.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold font-mono text-[10px] uppercase text-slate-500">{a.resource_type}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{a.title}</td>
                    <td className="px-4 py-3 leading-relaxed text-slate-500 dark:text-slate-400 max-w-[300px] truncate" title={a.description}>{a.description}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{a.created_at}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleResolveAlert(a.id)}
                        className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition"
                        title="Mark alert as resolved"
                      >
                        <Check size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
