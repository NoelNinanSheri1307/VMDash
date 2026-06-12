import React from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Inbox, Check, X, Clock, HelpCircle, Monitor, Cpu, HardDrive, Shield } from "lucide-react";

export default function VmRequestsManager() {
  const dummyRequests = [
    {
      vmName: "isro-dl-gpu01",
      hostname: "fsgpu-node1",
      environment: "GPU Node",
      cores: 16,
      ram: 64,
      disk: 500,
      source: "GD",
      narc: "N-405",
      timeCreated: "2026-06-12",
      requestedBy: "VS10124 (ANJANA S J)",
      status: "pending",
    },
    {
      vmName: "vssc-web-web05",
      hostname: "proxmox-vm5",
      environment: "Proxmox",
      cores: 4,
      ram: 16,
      disk: 150,
      source: "NARC",
      narc: "N-402",
      timeCreated: "2026-06-11",
      requestedBy: "VS10156 (ABHILASH KS)",
      status: "approved",
    }
  ];

  return (
    <PageContainer
      title="VM Provisioning Request Manager"
      description="Process, review, and authorize virtual machine deployment requests submitted by VSSC Entity divisions before hypervisor provisioning."
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Stats Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 flex flex-col gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Inbox size={18} className="text-blue-500" />
              Request Statistics
            </h3>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Pending Actions</span>
                <Badge variant="warning">1 Pending</Badge>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Approved This Week</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">12</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Rejected / Returned</span>
                <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">1</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-blue-50/20 border-blue-100/40">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <HelpCircle size={14} className="text-blue-500" />
              Operational Guide
            </h4>
            Approving a requested profile allocates IP/MAC values in the registry. Ensure targeted storage pools have sufficient space before pushing live.
          </Card>
        </div>

        {/* Right Requests List Column */}
        <div className="lg:col-span-3 space-y-5">
          {dummyRequests.map((req) => (
            <Card key={req.vmName} className="p-5 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === "pending" ? "bg-amber-500" : "bg-emerald-500"}`} />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-850 dark:text-slate-200 font-mono">{req.vmName}</h3>
                    <Badge variant={req.status === "pending" ? "warning" : "success"}>
                      {req.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Requested by: <span className="font-semibold text-slate-700 dark:text-slate-300">{req.requestedBy}</span> | Date: {req.timeCreated}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200/20">
                    Source: {req.source} / {req.narc}
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-t border-b border-slate-100 dark:border-slate-800/60 my-4 text-slate-700 dark:text-slate-350">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><Monitor size={15} /></div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">OS / Node</div>
                    <div className="font-semibold truncate">{req.environment}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg"><Cpu size={15} /></div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">vCPUs</div>
                    <div className="font-semibold">{req.cores} Cores</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><HardDrive size={15} /></div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">RAM Size</div>
                    <div className="font-semibold">{req.ram} GB</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><Shield size={15} /></div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Disk Storage</div>
                    <div className="font-semibold">{req.disk} GB</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {req.status === "pending" && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <X size={14} /> Return / Reject
                  </button>
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10">
                    <Check size={14} /> Approve & Sync
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
