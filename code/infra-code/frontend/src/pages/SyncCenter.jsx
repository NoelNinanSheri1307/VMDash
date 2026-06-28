import React, { useState } from "react";
import proxmoxApi from "../api/proxmoxapi";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { RefreshCw, CheckCircle2, AlertCircle, Play, Info } from "lucide-react";

export default function SyncCenter() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, failed
  const [errorMessage, setErrorMessage] = useState("");

  const [steps, setSteps] = useState({
    cluster: { label: "1. Cluster Configuration Sync", status: "idle", error: "" },
    nodes: { label: "2. Node Profiles & Workloads Sync", status: "idle", error: "" },
    storage: { label: "3. Datastores & Storage Pools Sync", status: "idle", error: "" },
    vms: { label: "4. Virtual Machine Instances Sync", status: "idle", error: "" },
  });

  const triggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus("syncing");
    setErrorMessage("");

    const startTime = Date.now();

    // Reset all steps to idle
    const updatedSteps = {
      cluster: { ...steps.cluster, status: "idle", error: "" },
      nodes: { ...steps.nodes, status: "idle", error: "" },
      storage: { ...steps.storage, status: "idle", error: "" },
      vms: { ...steps.vms, status: "idle", error: "" },
    };
    setSteps(updatedSteps);

    // Helper to run individual step
    const runStep = async (stepKey, url) => {
      setSteps(prev => ({
        ...prev,
        [stepKey]: { ...prev[stepKey], status: "syncing" }
      }));

      try {
        const response = await proxmoxApi.post(url);
        
        // Locate successful message (some endpoints return "message " key with trailing space!)
        const msg = response.data.message || response.data["message "] || "Sync completed successfully";
        
        setSteps(prev => ({
          ...prev,
          [stepKey]: { ...prev[stepKey], status: "success", error: msg }
        }));
        return true;
      } catch (err) {
        console.error(`Sync error on ${stepKey}:`, err);
        const errDetails = err.response?.data?.error || err.response?.data?.["error "] || err.message;
        setSteps(prev => ({
          ...prev,
          [stepKey]: { ...prev[stepKey], status: "failed", error: errDetails }
        }));
        throw new Error(errDetails);
      }
    };

    let finalStatus = "success";
    let finalSummary = "Successfully synced clusters, nodes, storage, and virtual machines";

    try {
      // Step 1: Cluster
      // await runStep("cluster", "/cluster/sync");         #removed because cluster entry is now manual. there is nothing to sync now for a cluster
      // Step 2: Nodes
      await runStep("nodes", "/nodes/sync");
      // Step 3: Storage
      await runStep("storage", "/storage/sync");
      // Step 4: VMs
      await runStep("vms", "/vms/sync");

      setSyncStatus("success");
    } catch (err) {
      finalStatus = "failed";
      finalSummary = `Sync failed: ${err.message || "An unexpected error occurred during database sync operations."}`;
      setSyncStatus("failed");
      setErrorMessage(err.message || "An unexpected error occurred during database sync operations.");
    } finally {
      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      try {
        await proxmoxApi.post("/sync-logs", {
          duration: parseFloat(durationSeconds),
          status: finalStatus,
          summary: finalSummary
        });
      } catch (logErr) {
        console.error("Failed to write synchronization log to server ledger:", logErr);
      }
      setSyncing(false);
    }
  };

  const getStepIcon = (status) => {
    switch (status) {
      case "syncing":
        return <RefreshCw size={20} className="text-blue-600 dark:text-blue-400 animate-spin" />;
      case "success":
        return <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />;
      case "failed":
        return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700" />;
    }
  };

  return (
    <PageContainer
      title="System Sync Center"
      description="Synchronize database inventory tables with active Proxmox VE hypervisor configurations."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Sync Trigger Panel */}
        <Card className="lg:col-span-1 flex flex-col justify-between p-6 h-fit">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
              Operational Actions
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Triggering synchronization queries the hypervisor APIs directly, updates SQL registries, and aligns cluster topology mappings.
            </p>
            
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>SYSTEM STATE</span>
                <span>STATE</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sync Status</span>
                <Badge variant={syncStatus === "success" ? "success" : syncStatus === "failed" ? "danger" : syncStatus === "syncing" ? "warning" : "default"}>
                  {syncStatus}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={triggerSync}
            disabled={syncing}
            className={`
              mt-8 w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-2
              ${syncing
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              }
            `}
          >
            {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {syncing ? "Sync In Progress..." : "Trigger Full Sync"}
          </button>
        </Card>

        {/* Right Side: Step-by-Step Status Cards */}
        <Card className="lg:col-span-2 p-6 flex flex-col gap-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Info size={18} />
            Execution Timeline and API Response Feedback
          </h3>

          <div className="space-y-4">
            {Object.keys(steps).map((key) => {
              const step = steps[key];
              return (
                <div 
                  key={key} 
                  className={`
                    border rounded-xl p-4 transition-colors duration-150 flex items-start gap-4
                    ${step.status === "syncing"
                      ? "border-blue-200 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/10"
                      : step.status === "success"
                      ? "border-green-100 bg-green-50/10 dark:border-green-900/20 dark:bg-green-950/5"
                      : step.status === "failed"
                      ? "border-red-100 bg-red-50/10 dark:border-red-900/20 dark:bg-red-950/5"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    }
                  `}
                >
                  <div className="mt-0.5">{getStepIcon(step.status)}</div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {step.label}
                    </div>
                    {step.error && (
                      <div className={`text-xs font-mono break-all leading-normal ${step.status === "failed" ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {step.status === "failed" ? "ERROR: " : ""}{step.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {syncStatus === "failed" && errorMessage && (
            <div className="border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 rounded-xl p-4 text-xs font-mono text-red-700 dark:text-red-400 break-all leading-relaxed">
              <span className="font-bold">Sync Failure Root Cause Log:</span><br />
              {errorMessage}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
