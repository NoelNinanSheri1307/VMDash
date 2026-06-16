import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { 
  User, Shield, Mail, Calendar, Key, AlertCircle, 
  Database, Monitor, Cpu, HardDrive, CpuIcon, Network, Clock
} from "lucide-react";

export default function MyProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await webApi.get("/auth/profile");
        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.response?.data?.error || "Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <PageContainer title="My Profile">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Retrieving profile registry data...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="My Profile">
        <Card className="p-6 border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10 max-w-2xl mx-auto mt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-1" size={24} />
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Failed to Load Profile</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Retry Request
              </button>
            </div>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="My Profile" 
      description="View registry records, structural associations, and hypervisor asset assignments."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Card & Security Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 flex flex-col items-center text-center relative overflow-hidden border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            
            <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-slate-800 border-2 border-blue-100 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner mb-4 mt-2">
              <User size={48} strokeWidth={1.5} />
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{profile?.name}</h2>
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1">{profile?.staff_code}</p>
            
            <div className="flex gap-2 mt-4">
              <Badge variant={profile?.role === "admin" ? "danger" : profile?.role === "manager" ? "warning" : "info"}>
                {profile?.role?.toUpperCase()}
              </Badge>
              <Badge variant="success">
                {profile?.status?.toUpperCase()}
              </Badge>
            </div>

            <div className="w-full border-t border-slate-100 dark:border-slate-800/80 my-6 pt-6 text-left space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 uppercase font-semibold">Center</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{profile?.center}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 uppercase font-semibold">Created</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {profile?.created_at ? profile.created_at.split(" ")[0] : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 uppercase font-semibold">Last Login</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-right">
                  {profile?.last_login_at || "—"}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/change-password")}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-slate-200/50 dark:border-slate-700/50"
            >
              <Key size={16} />
              Change Password
            </button>
          </Card>
          
          {/* Security details info */}
          <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm mb-3">
              <Shield size={16} className="text-blue-500" />
              Access Privileges
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your account is associated with the <span className="font-bold">{profile?.role}</span> role. Permissions include access to {profile?.role === "admin" ? "system tables, virtual machine orchestration, cluster settings, and administrative backups." : profile?.role === "manager" ? "nodes metrics, VM owner mapping list, and VM requests reviews." : "general virtual machine monitoring dashboards and own VM usage analytics."}
            </p>
          </Card>
        </div>

        {/* Structural Org & Assets panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Structural Details Card */}
          <Card className="p-6 border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
              <Database size={18} className="text-indigo-500" />
              Organizational Tree Mappings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase font-semibold block">Entity</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl font-bold text-slate-700 dark:text-slate-300">
                  {profile?.entity || "—"}
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase font-semibold block">Group Name</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl font-bold text-slate-700 dark:text-slate-300">
                  {profile?.groupname || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase font-semibold block">Division</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl font-bold text-slate-700 dark:text-slate-300">
                  {profile?.division || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase font-semibold block">Section</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl font-bold text-slate-700 dark:text-slate-300">
                  {profile?.section || "—"}
                </div>
              </div>
            </div>
          </Card>

          {/* Virtual Machines Card */}
          <Card className="p-6 border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Monitor size={18} className="text-blue-500" />
              Assigned Virtual Machines ({profile?.vms?.length || 0})
            </h3>
            
            {!profile?.vms || profile.vms.length === 0 ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No virtual machine instances are assigned under your ownership registry.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {profile.vms.map((vm, idx) => (
                  <div 
                    key={idx}
                    className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-200 dark:hover:border-slate-800 transition duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-3">
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{vm.vm_name}</span>
                        {vm.host_name && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono ml-2">({vm.host_name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={vm.status === "running" ? "success" : "default"}>
                          {vm.status || "offline"}
                        </Badge>
                        <Badge variant="info">
                          {vm.environment}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-400 block">IP Address</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{vm.ip || "—"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block">CPU Cores</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{vm.cores} Cores</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block">Memory</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{vm.ram} GB</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block">Storage Size</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{vm.disk_size} GB</span>
                      </div>
                    </div>

                    {/* Extended Specs */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-semibold">Cluster:</span> {vm.cluster || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">OS:</span> {vm.os || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">GPU:</span> {vm.gpu ? "NVIDIA Enabled" : "None"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </PageContainer>
  );
}
