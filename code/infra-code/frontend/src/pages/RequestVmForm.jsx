import React, { useState } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import { Monitor, Cpu, HardDrive, Shield, FileText, ArrowRight, Save } from "lucide-react";

export default function RequestVmForm() {
  const [formData, setFormData] = useState({
    vmName: "",
    hostname: "",
    environment: "Proxmox",
    cores: "4",
    ram: "16",
    disk: "100",
    source: "NARC",
    narc: "",
    os: "Linux",
    justification: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormData({
      vmName: "",
      hostname: "",
      environment: "Proxmox",
      cores: "4",
      ram: "16",
      disk: "100",
      source: "NARC",
      narc: "",
      os: "Linux",
      justification: ""
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <PageContainer title="Request Provisioning">
        <div className="flex justify-center items-center h-[50vh]">
          <Card className="max-w-md p-6 text-center border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
              <Save size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Request Submitted Successfully</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Your VM request for <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formData.vmName}</span> has been saved to the registry and queued for administrator review.
            </p>
            <button 
              onClick={handleReset}
              className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
            >
              Request Another VM
            </button>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Self-Service VM Request Form"
      description="Submit resource allocation configurations to the workflow registry for operator authorization and deployment."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <Card className="lg:col-span-2 p-6 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <FileText size={18} className="text-blue-500" />
              Machine Profile specifications
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">VM Instance Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. ccds-dev-node01"
                  value={formData.vmName}
                  onChange={(e) => setFormData({...formData, vmName: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Hostname</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. dev-host.vssc"
                  value={formData.hostname}
                  onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Environment Type</label>
                <select 
                  value={formData.environment}
                  onChange={(e) => setFormData({...formData, environment: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-850 dark:text-slate-200 focus:border-blue-500 transition"
                >
                  <option value="Proxmox">Proxmox VE</option>
                  <option value="RHV">RHV Cluster</option>
                  <option value="GPU Node">GPU Node Cluster</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">OS Platform</label>
                <select 
                  value={formData.os}
                  onChange={(e) => setFormData({...formData, os: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-850 dark:text-slate-200 focus:border-blue-500 transition"
                >
                  <option value="Linux">Linux (Ubuntu/CentOS)</option>
                  <option value="Windows">Windows Server</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Allocation Source</label>
                <select 
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-855 dark:text-slate-200 focus:border-blue-500 transition"
                >
                  <option value="NARC">NARC Request</option>
                  <option value="GD">GD Request</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">NARC Number (If NARC source)</label>
                <input 
                  type="text" 
                  placeholder="e.g. N-405"
                  disabled={formData.source !== "NARC"}
                  value={formData.narc}
                  onChange={(e) => setFormData({...formData, narc: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition disabled:opacity-55 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Justification Notes</label>
                <input 
                  type="text" 
                  placeholder="Brief reason for resources..."
                  value={formData.justification}
                  onChange={(e) => setFormData({...formData, justification: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition" 
                />
              </div>
            </div>

            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 pt-4">
              <Cpu size={18} className="text-indigo-500" />
              Compute Resources
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">vCPU Cores</label>
                <select 
                  value={formData.cores}
                  onChange={(e) => setFormData({...formData, cores: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-850 dark:text-slate-200 focus:border-blue-500 transition"
                >
                  <option value="2">2 Cores</option>
                  <option value="4">4 Cores</option>
                  <option value="8">8 Cores</option>
                  <option value="16">16 Cores</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">RAM Memory (GiB)</label>
                <select 
                  value={formData.ram}
                  onChange={(e) => setFormData({...formData, ram: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-850 dark:text-slate-200 focus:border-blue-500 transition"
                >
                  <option value="4">4 GiB</option>
                  <option value="8">8 GiB</option>
                  <option value="16">16 GiB</option>
                  <option value="32">32 GiB</option>
                  <option value="64">64 GiB</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Disk Storage (GiB)</label>
                <select 
                  value={formData.disk}
                  onChange={(e) => setFormData({...formData, disk: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-850 dark:text-slate-200 focus:border-blue-500 transition"
                >
                  <option value="50">50 GiB</option>
                  <option value="100">100 GiB</option>
                  <option value="250">250 GiB</option>
                  <option value="500">500 GiB</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="mt-6 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              Submit Request Profile <ArrowRight size={16} />
            </button>
          </form>
        </Card>

        {/* Right Info Details panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 flex flex-col gap-4 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Monitor size={18} className="text-blue-500" />
              Allocation Guidelines
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standard allocations are approved automatically for users requesting up to 8 vCPUs and 32 GiB RAM. 
              Higher specifications require additional justification in the comments, subject to review by administrative operators.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
