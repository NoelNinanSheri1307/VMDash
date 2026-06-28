import React, { useState, useEffect } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { History, Calendar, Clock, User, CheckCircle2, ChevronRight, Terminal, AlertCircle } from "lucide-react";

export default function SyncLogsCenter() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    avg_duration: "0.0s",
    success_rate: "100.0%",
    scheduled_interval: "Every 4 hrs"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await proxmoxApi.get("/sync-logs");
      setLogs(response.data.logs || []);
      if (response.data.stats) {
        setStats(response.data.stats);
      }
      setError("");
    } catch (err) {
      console.error("Error fetching sync logs:", err);
      setError(err.response?.data?.error || "Failed to load audit logs from system registries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(false);
    // Refresh log list every 10 seconds silently
    const interval = setInterval(() => fetchLogs(true), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageContainer
      title="Sync Center Audit Logs"
      description="Administrative overview tracking the execution timeline, latency metrics, and success status of hypervisor synchronization operations."
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column - Overall Stats */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="p-5 flex flex-col gap-4 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <History size={18} className="text-blue-500" />
              Sync Statistics
            </h3>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Total Synchronizations</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Average Duration</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{stats.avg_duration}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Scheduled Sync Interval</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{stats.scheduled_interval}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Success Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.success_rate}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 flex flex-col gap-3 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sync Center Note</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Automatic sync operations run via back-end Cron tasks. Detailed error logs are maintained inside hypervisor container runtimes.
            </p>
          </Card>
        </div>

        {/* Right Column - Logs Table list */}
        <Card className="xl:col-span-3 p-6 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Terminal size={18} className="text-indigo-500" />
              Activity Ledger
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-mono">AUTO-REFRESHING</span>
          </div>

          {error && (
            <div className="border border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10 rounded-xl p-4 flex gap-3 text-sm text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="shrink-0" size={20} />
              <span>{error}</span>
            </div>
          )}

          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading sync log audits...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500 dark:text-slate-400">
              No synchronization events have been recorded in the database audit logs.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 transition duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-mono font-medium">
                        <Calendar size={13} />
                        {log.timestamp}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-mono font-medium">
                        <Clock size={13} />
                        {log.duration}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-mono font-medium">
                        <User size={13} />
                        {log.triggeredBy}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {log.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={log.status === "success" ? "success" : "danger"}>
                      {log.status}
                    </Badge>
                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 hidden md:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
