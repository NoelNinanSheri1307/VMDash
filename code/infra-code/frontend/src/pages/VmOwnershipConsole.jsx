import React, { useState, useEffect } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { UserCheck, ShieldAlert, Users, PlusCircle, Search, HelpCircle, Monitor, ShieldAlert as AlertIcon, CheckCircle2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import proxmoxApi from "../api/proxmoxapi";

export default function VmOwnershipConsole() {
  const [assignedVms, setAssignedVms] = useState([]);
  const [unassignedVms, setUnassignedVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });

  // Assign Owner Modal state
  const [assignModal, setAssignModal] = useState({ show: false, vmUuid: "", vmName: "", staffCode: "" });

  const fetchOwnershipData = async () => {
    setLoading(true);
    try {
      const [assignedRes, unassignedRes] = await Promise.all([
        proxmoxApi.get("/proxmox/ownership/assigned"),
        proxmoxApi.get("/proxmox/ownership/unassigned")
      ]);
      setAssignedVms(assignedRes.data || []);
      setUnassignedVms(unassignedRes.data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch VM ownership data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnershipData();
  }, []);

  const handleOpenAssignModal = (uuid, name) => {
    setAssignModal({
      show: true,
      vmUuid: uuid,
      vmName: name,
      staffCode: ""
    });
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setSuccessMsg("");
    if (!assignModal.staffCode) return;
    try {
      await proxmoxApi.post("/proxmox/ownership/assign", {
        uuid: assignModal.vmUuid,
        staff_code: assignModal.staffCode
      });
      setSuccessMsg(`Successfully assigned user ${assignModal.staffCode} as owner of VM '${assignModal.vmName}'.`);
      setAssignModal({ show: false, vmUuid: "", vmName: "", staffCode: "" });
      fetchOwnershipData();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to assign owner.");
    }
  };

  const handleRemoveOwner = (vmUuid, staffCode, vmName) => {
    setActionError("");
    setSuccessMsg("");
    setConfirmModal({
      show: true,
      title: "Remove VM Owner",
      message: `Are you sure you want to remove user ${staffCode} as owner of VM '${vmName}'?`,
      onConfirm: async () => {
        try {
          await proxmoxApi.delete("/proxmox/ownership/assign", {
            params: { uuid: vmUuid, staff_code: staffCode }
          });
          setSuccessMsg(`Successfully removed user ${staffCode} as owner of VM '${vmName}'.`);
          fetchOwnershipData();
        } catch (err) {
          setActionError(err.response?.data?.error || "Failed to remove owner.");
        }
      }
    });
  };

  // Calculations for KPIs
  const assignedCount = assignedVms.length;
  const unassignedCount = unassignedVms.length;
  const totalCount = assignedCount + unassignedCount;
  const coveragePercent = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 100;

  // Search filter
  const filteredAssigned = assignedVms.filter(
    (vm) =>
      vm.vm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vm.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vm.owners.some(o => o.staff_code.toLowerCase().includes(searchQuery.toLowerCase()) || o.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUnassigned = unassignedVms.filter(
    (vm) =>
      vm.vm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vm.ip.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer
      title="VM Ownership & Focal Points Console"
      description="Manage hypervisor user enrollment pivot links, audits, and assign division focal points directly to live machines."
    >
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

      {/* 7. Ownership Coverage KPIs at the Top */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned VMs</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{assignedCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Enrolled owners linked</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unassigned VMs</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">{unassignedCount}</div>
            <p className="text-[10px] text-rose-500/80 mt-0.5">Ownerless VMs requiring audit</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ownership Coverage %</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">{coveragePercent}%</div>
            <p className="text-[10px] text-slate-400 mt-0.5">System-wide ownership ratio</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-5 bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Virtual Machine Registry Matching</h3>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
          <Search size={14} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search VMs or owners..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none max-w-[250px]" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned VMs (Alerts) Column */}
        <div className="space-y-6">
          <Card className="p-5 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-500" />
                Unassigned VMs Audit Pipeline
              </h3>
              <Badge variant="danger">{unassignedCount} Active</Badge>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading...</div>
            ) : filteredUnassigned.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No unassigned VMs matching criteria.</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredUnassigned.map((vm) => (
                  <div key={vm.vm_uuid} className="border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-800/10 hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-rose-500/10 text-rose-600 rounded"><Monitor size={14} /></div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{vm.vm_name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-slate-400 font-mono">
                        <span>VMID: {vm.vm_id}</span>
                        <span>IP: {vm.ip || "No IP Address"}</span>
                        <span>Cores: {vm.cpus}</span>
                        <span>RAM: {vm.max_memory} GB</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenAssignModal(vm.vm_uuid, vm.vm_name)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                    >
                      <Plus size={12} /> Map Owner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Assigned VMs Column */}
        <div className="space-y-6">
          <Card className="p-5 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-500" />
                Active Ownership Allocations
              </h3>
              <Badge variant="success">{assignedCount} Enrolled</Badge>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading...</div>
            ) : filteredAssigned.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No assigned VMs matching criteria.</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredAssigned.map((vm) => (
                  <div key={vm.vm_uuid} className="border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-800/10 hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-emerald-500/10 text-emerald-600 rounded"><Monitor size={14} /></div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{vm.vm_name}</h4>
                      </div>
                      <button 
                        onClick={() => handleOpenAssignModal(vm.vm_uuid, vm.vm_name)}
                        className="px-2 py-1 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 hover:text-blue-500 rounded-lg font-bold transition flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Add Owner
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span>VMID: {vm.vm_id}</span>
                      <span>IP: {vm.ip || "No IP Address"}</span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned Owners</div>
                      {vm.owners.map((owner) => (
                        <div key={owner.staff_code} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="font-bold font-mono text-slate-750 dark:text-slate-250">{owner.staff_code}</span>
                            <span className="text-slate-500 dark:text-slate-400 ml-2">— {owner.name} ({owner.division})</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveOwner(vm.vm_uuid, owner.staff_code, vm.vm_name)}
                            className="text-rose-500 hover:text-rose-700 transition"
                            title="Remove owner"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Map Owner Modal */}
      {assignModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleAssignSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Assign Owner to VM</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter target employee staff code to register ownership for VM <span className="font-mono font-bold">{assignModal.vmName}</span>
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee Staff Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VS10106"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition"
                  value={assignModal.staffCode}
                  onChange={(e) => setAssignModal({ ...assignModal, staffCode: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAssignModal({ show: false, vmUuid: "", vmName: "", staffCode: "" })}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ show: false, title: "", message: "", onConfirm: null })}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
