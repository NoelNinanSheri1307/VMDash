import React, { useState, useEffect } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Inbox, Check, X, Clock, HelpCircle, Monitor, Cpu, HardDrive, Shield } from "lucide-react";
import proxmoxApi from "../api/proxmoxapi";

export default function VmRequestsManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [commentModal, setCommentModal] = useState({ show: false, requestUuid: "", isApprove: true, comment: "" });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await proxmoxApi.get("/proxmox/requests");
      setRequests(res.data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch provisioning requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleActionClick = (uuid, isApprove) => {
    setCommentModal({
      show: true,
      requestUuid: uuid,
      isApprove,
      comment: ""
    });
  };

  const handleModalSubmit = async () => {
    const { requestUuid, isApprove, comment } = commentModal;
    setActionError("");
    setSuccessMsg("");
    try {
      if (isApprove) {
        await proxmoxApi.post(`/proxmox/requests/${requestUuid}/approve`, { comments: comment });
        setSuccessMsg("VM provisioning request approved successfully.");
      } else {
        await proxmoxApi.post(`/proxmox/requests/${requestUuid}/reject`, { comments: comment });
        setSuccessMsg("VM provisioning request rejected.");
      }
      setCommentModal({ show: false, requestUuid: "", isApprove: true, comment: "" });
      fetchRequests();
    } catch (err) {
      setActionError(err.response?.data?.error || "Action failed.");
    }
  };

  // Calculate stats
  const pendingCount = requests.filter(r => r.request_status === "pending").length;
  const approvedCount = requests.filter(r => r.request_status === "approved").length;
  const rejectedCount = requests.filter(r => r.request_status === "rejected").length;
  const totalDecided = approvedCount + rejectedCount;
  const approvalRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 100;

  return (
    <PageContainer
      title="VM Provisioning Request Manager"
      description="Process, review, and authorize virtual machine deployment requests submitted by VSSC Entity divisions before hypervisor provisioning."
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
                <Badge variant={pendingCount > 0 ? "warning" : "success"}>
                  {pendingCount} Pending
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Approved</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{approvedCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Rejected</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{rejectedCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Approval Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{approvalRate}%</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-blue-50/20 border-blue-100/40">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <HelpCircle size={14} className="text-blue-500" />
              Operational Guide
            </h4>
            Approving a requested profile allocates resources in the registry. Make sure targeted storage pools have sufficient space before approving provisioning.
          </Card>
        </div>

        {/* Right Requests List Column */}
        <div className="lg:col-span-3 space-y-5">
          {loading ? (
            <div className="text-center py-10 text-sm text-slate-400">Loading requests...</div>
          ) : error ? (
            <div className="text-center py-10 text-sm text-rose-500">{error}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">No VM requests found in the registry.</div>
          ) : (
            requests.map((req) => (
              <Card key={req.request_uuid} className="p-5 border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  req.request_status === "pending" ? "bg-amber-500" :
                  req.request_status === "approved" ? "bg-emerald-500" : "bg-rose-500"
                }`} />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono">{req.vm_name}</h3>
                      <Badge variant={
                        req.request_status === "pending" ? "warning" :
                        req.request_status === "approved" ? "success" : "danger"
                      }>
                        {req.request_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Requested by: <span className="font-semibold text-slate-700 dark:text-slate-300">{req.requested_by}</span> | Date: {req.created_at}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200/20">
                      Hostname: {req.hostname}
                    </span>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-t border-b border-slate-100 dark:border-slate-800/60 my-4 text-slate-700 dark:text-slate-350">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><Monitor size={15} /></div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">OS / Env</div>
                      <div className="font-semibold truncate">{req.os} / {req.environment}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg"><Cpu size={15} /></div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">vCPUs</div>
                      <div className="font-semibold">{req.cpu_cores} Cores</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><HardDrive size={15} /></div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">RAM Size</div>
                      <div className="font-semibold">{req.ram_gb} GB</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><Shield size={15} /></div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Disk Storage</div>
                      <div className="font-semibold">{req.disk_gb} GB</div>
                    </div>
                  </div>
                </div>

                {req.justification && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-3 italic">
                    Justification: "{req.justification}"
                  </div>
                )}

                {req.reviewer_comments && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-3 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                    <span className="font-bold">Reviewer ({req.reviewer_staff_code}):</span> "{req.reviewer_comments}"
                  </div>
                )}

                {/* Action Buttons */}
                {req.request_status === "pending" && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button 
                      onClick={() => handleActionClick(req.request_uuid, false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <X size={14} /> Reject
                    </button>
                    <button 
                      onClick={() => handleActionClick(req.request_uuid, true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                    >
                      <Check size={14} /> Approve
                    </button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Reviewer Comment Modal */}
      {commentModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              {commentModal.isApprove ? "Approve Provisioning Request" : "Reject Provisioning Request"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add your comments or deployment instructions for this action.
            </p>
            <textarea
              className="w-full h-24 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition resize-none"
              placeholder="Enter review comments (optional)..."
              value={commentModal.comment}
              onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setCommentModal({ show: false, requestUuid: "", isApprove: true, comment: "" })}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition ${
                  commentModal.isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Confirm {commentModal.isApprove ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
