import React from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { UserCheck, ShieldAlert, Users, PlusCircle, Search, HelpCircle, Monitor } from "lucide-react";

export default function VmOwnershipConsole() {
  const dummyOwnerlessVms = [
    {
      vmid: 104,
      name: "fsgpu-unassigned-temp",
      cluster: "fsgpucluster-25",
      node: "fsgpu2",
      memory: "32 GiB",
      cores: 8,
    },
    {
      vmid: 108,
      name: "isro-test-node",
      cluster: "fsgpucluster-25",
      node: "fsgpu1",
      memory: "16 GiB",
      cores: 4,
    }
  ];

  return (
    <PageContainer
      title="VM Ownership & Focal Points Console"
      description="Manage hypervisor user enrollment pivot links, audits, and assign division focal points (COM/End User Focal Points) directly to live machines."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Summary and Bulk Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 flex flex-col gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserCheck size={18} className="text-blue-500" />
              Ownership Stats
            </h3>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Total Enrolled VMs</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">78</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Linked Focal Points</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">72 VMs</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Owner-less VMs (Alerts)</span>
                <span className="font-bold text-rose-500 font-mono">2 VMs</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Directory Mapping sync</span>
                <Badge variant="success">aligned</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5 flex flex-col gap-4 bg-white/70 dark:bg-slate-900/70">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users size={18} className="text-indigo-500" />
              Bulk User Mapper
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Batch associate VSSC staff codes directly to a targeted list of virtual machines via pivot maps.
            </p>
            <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-md">
              <PlusCircle size={14} /> Open Bulk Mapper Wizard
            </button>
          </Card>
        </div>

        {/* Right Side: Ownerless VMs Audit List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-500" />
                Unassigned VMs Audit Pipeline
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-mono">2 DETECTED</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              The following live virtualization containers are running on clusters without any mapped consumer relations or focal points inside the configuration database.
            </p>

            <div className="space-y-3">
              {dummyOwnerlessVms.map((vm) => (
                <div key={vm.vmid} className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/20 hover:bg-slate-100/40 dark:hover:bg-slate-850/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-md"><Monitor size={14} /></div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{vm.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">
                      <span>VMID: {vm.vmid}</span>
                      <span>Cluster: {vm.cluster}</span>
                      <span>Node: {vm.node}</span>
                      <span>Cores: {vm.cores}</span>
                      <span>Memory: {vm.memory}</span>
                    </div>
                  </div>

                  <button className="self-end sm:self-auto px-4 py-2 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:text-blue-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-white dark:bg-slate-900">
                    Map Owner
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
