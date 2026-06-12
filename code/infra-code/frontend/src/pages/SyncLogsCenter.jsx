import React from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { History, Calendar, Clock, User, CheckCircle2, ChevronRight, Terminal } from "lucide-react";

export default function SyncLogsCenter() {
  const dummyLogs = [
    {
      id: 1,
      timestamp: "2026-06-12 12:45:10",
      duration: "14.2s",
      triggeredBy: "VS10106 (Admin)",
      status: "success",
      summary: "Successfully synced 80 VMs, 2 physical nodes, and 5 storage directory paths",
    },
    {
      id: 2,
      timestamp: "2026-06-12 08:30:00",
      duration: "15.8s",
      triggeredBy: "System (Scheduled Cron)",
      status: "success",
      summary: "Synced clusters, refreshed node stress pressure index matrices",
    },
    {
      id: 3,
      timestamp: "2026-06-11 18:15:22",
      duration: "13.9s",
      triggeredBy: "VS10106 (Admin)",
      status: "success",
      summary: "Deep-synced hardware configurations, disk sizes, and Focal Points",
    },
    {
      id: 4,
      timestamp: "2026-06-11 12:00:00",
      duration: "1.2s",
      triggeredBy: "System (Scheduled Cron)",
      status: "failed",
      summary: "Connection timeout while polling host fsgpu3. Intranet latency spike.",
    }
  ];

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
                <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">142</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Average Duration</span>
                <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">14.1s</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Scheduled Sync Interval</span>
                <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">Every 4 hrs</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Success Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">98.5%</span>
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

          <div className="space-y-4">
            {dummyLogs.map((log) => (
              <div 
                key={log.id} 
                className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 transition duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                    {log.status === "success" ? "success" : "failed"}
                  </Badge>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 hidden md:block" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
