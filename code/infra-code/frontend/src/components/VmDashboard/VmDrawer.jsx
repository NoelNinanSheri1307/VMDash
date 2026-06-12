import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, Cpu, Users, HardDrive, Settings, UserPlus, UserMinus, ShieldAlert } from "lucide-react";
import proxmoxApi from "../../api/proxmoxapi";
import Loader from "../Loader";

const formatUptime = (seconds) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const sec = Number(seconds);
    if (isNaN(sec) || sec <= 0) return "Offline";
    const days = Math.floor(sec / (3600 * 24));
    const hours = Math.floor((sec % (3600 * 24)) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.length > 0 ? parts.join(" ") : "< 1m";
};

const formatGB = (gb) => {
    if (gb === null || gb === undefined) return "N/A";
    const val = Number(gb);
    if (val >= 1024) {
        return `${(val / 1024).toFixed(1)} TB`;
    }
    return `${val.toFixed(1)} GB`;
};

const VmDrawer = ({ 
    vm, 
    isOpen, 
    onClose, 
    role, 
    staffCode, 
    onAddUser, 
    onRemoveUser, 
    cache = {}, 
    onUpdateCache 
}) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (!isOpen || !vm?.vm_uuid) return;

        // Reset tab to overview on VM change
        setActiveTab("overview");

        // Check cache first
        if (cache[vm.vm_uuid]) {
            setDetails(cache[vm.vm_uuid]);
            return;
        }

        // Cache miss: fetch from backend
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await proxmoxApi.get(`/proxmox/vms/vmData/${vm.vm_uuid}`);
                setDetails(res.data);
                if (onUpdateCache) {
                    onUpdateCache(vm.vm_uuid, res.data);
                }
            } catch (err) {
                console.error("Failed to fetch VM details for drawer:", err);
                setDetails(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [vm, isOpen, cache, onUpdateCache]);

    if (!isOpen) return null;

    const tabs = [
        { id: "overview", label: "Overview", icon: Info },
        { id: "resources", label: "Resources", icon: Cpu },
        { id: "ownership", label: "Ownership", icon: Users },
        { id: "storage", label: "Storage", icon: HardDrive },
        { id: "technical", label: "Technical", icon: Settings },
    ];

    // Filter users list based on role for data protection
    const allUsers = details?.user_info || [];
    const displayedUsers = role === "user" 
        ? allUsers.filter(u => u.staff_code === staffCode) 
        : allUsers;

    return (
        <AnimatePresence>
            {/* Backdrop Overlay */}
            <motion.div 
                className="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Sliding Container */}
            <motion.div 
                className="drawer-container text-slate-800 dark:text-slate-100"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                                vm?.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`} />
                            <h2 className="text-xl font-bold tracking-tight">{vm?.vm_name || "VM Details"}</h2>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {vm?.vm_id} | Node: {vm?.node_name}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 overflow-x-auto no-scrollbar">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                                    isActive 
                                    ? "border-role-primary text-role-primary" 
                                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                            >
                                <Icon size={14} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 dark:bg-slate-900/10">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader text="Fetching details..." />
                        </div>
                    ) : !details ? (
                        <div className="text-center text-slate-500 py-12">
                            <ShieldAlert className="mx-auto text-slate-300 mb-2" size={36} />
                            <p className="text-sm">Unable to load VM specifications.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Tab 1: Overview */}
                            {activeTab === "overview" && (
                                <div className="space-y-3.5">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3">General Information</h3>
                                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">UUID</span>
                                                <span className="font-mono text-[11px] select-all">{details.vm_uuid}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">Hostname</span>
                                                <span className="font-mono text-xs">{details.vm_host_name || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">Status</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    details.status === "running" ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                }`}>{details.status}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">Uptime</span>
                                                <span className="font-medium text-xs text-slate-700 dark:text-slate-350">{formatUptime(details.uptime)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">Created Date</span>
                                                <span className="text-xs text-slate-600 dark:text-slate-400">{details.created_date || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">Display Type</span>
                                                <span className="text-xs capitalize font-medium">{details.display_type || "Standard"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3">Network Interfaces</h3>
                                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">IP Address</span>
                                                <span className="font-mono text-xs select-all">{details.ip || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 font-medium block">MAC Address</span>
                                                <span className="font-mono text-xs select-all">{details.mac || "N/A"}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-xs text-slate-400 font-medium block">Operating System</span>
                                                <span className="text-xs font-semibold">{details.os || "Unknown"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Resources */}
                            {activeTab === "resources" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <span className="text-xs text-slate-400 font-medium block">Compute Cores</span>
                                        <div className="text-3xl font-extrabold text-role-primary mt-1">{details.cpus} <span className="text-xs font-semibold text-slate-500">vCPUs</span></div>
                                        <div className="text-xs text-slate-500 mt-1.5 font-mono">Sockets: {details.sockets || 1}</div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <span className="text-xs text-slate-400 font-medium block">Memory Footprint</span>
                                        <div className="text-3xl font-extrabold text-role-primary mt-1">{formatGB(details.max_memory)}</div>
                                        <div className="text-xs text-slate-500 mt-1.5 font-mono">Allocation limit</div>
                                    </div>

                                    <div className="col-span-1 sm:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3">Storage Allocation</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-role-primary-light text-role-primary rounded-xl">
                                                <HardDrive size={24} />
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold">{formatGB(details.max_disk)}</div>
                                                <div className="text-xs text-slate-500">Aggregated disk layout size</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-1 sm:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3">GPU Coprocessor</h3>
                                        {details.gpu ? (
                                            <div>
                                                <span className="px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Enabled</span>
                                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">{details.gpu_info || "Generic GPU controller"}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-500 font-medium">No GPU controller assigned to this configuration.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Ownership */}
                            {activeTab === "ownership" && (
                                <div className="space-y-4">
                                    {/* Action Buttons for Admin only */}
                                    {role === "admin" && (
                                        <div className="flex gap-2.5">
                                            <button
                                                onClick={onAddUser}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-role-primary hover:bg-role-primary-hover shadow-sm transition"
                                            >
                                                <UserPlus size={14} />
                                                Add User
                                            </button>
                                            <button
                                                onClick={onRemoveUser}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
                                            >
                                                <UserMinus size={14} />
                                                Remove User
                                            </button>
                                        </div>
                                    )}

                                    {/* Assigned Users Grid */}
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3">
                                            Assigned Focal Points ({displayedUsers.length})
                                        </h3>
                                        
                                        {displayedUsers.length === 0 ? (
                                            <div className="text-center text-slate-500 py-6">
                                                <Users className="mx-auto text-slate-200 mb-2" size={32} />
                                                <p className="text-xs font-medium">No owner relations assigned to this VM.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {displayedUsers.map((u, index) => (
                                                    <div key={index} className="py-3 first:pt-0 last:pb-0 text-sm">
                                                        <div className="flex justify-between font-semibold">
                                                            <span className="text-role-primary select-all">{u.staff_code}</span>
                                                            {role !== "user" && <span className="text-slate-900 dark:text-slate-100">{u.name}</span>}
                                                        </div>
                                                        {role !== "user" && (
                                                            <div className="grid grid-cols-3 gap-1.5 text-slate-500 text-[11px] mt-1.5 font-medium">
                                                                <div><span className="block text-[10px] text-slate-400 uppercase">Entity</span>{u.entity || "-"}</div>
                                                                <div><span className="block text-[10px] text-slate-400 uppercase">Division</span>{u.division || "-"}</div>
                                                                <div><span className="block text-[10px] text-slate-400 uppercase">Group</span>{u.group || "-"}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Storage */}
                            {activeTab === "storage" && (
                                <div className="space-y-3.5">
                                    {(!details.storages || details.storages.length === 0) ? (
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 shadow-sm">
                                            <HardDrive className="mx-auto text-slate-200 mb-2" size={32} />
                                            <p className="text-xs">No storage mappings found.</p>
                                        </div>
                                    ) : (
                                        details.storages.map((s, index) => (
                                            <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3">
                                                    <div className="font-semibold text-sm truncate max-w-[70%]">{s.disk_image}</div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        s.live_status === "active" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500"
                                                    }`}>{s.live_status || "Unknown"}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                                                    <div>
                                                        <span className="text-slate-400 font-medium block">Storage Volume</span>
                                                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{s.storage_name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 font-medium block">Allocated Size</span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{s.size} GB</span>
                                                    </div>
                                                    {s.initial_storage_entry_time && (
                                                        <div className="col-span-2">
                                                            <span className="text-slate-400 font-medium block">Entry Initialized</span>
                                                            <span className="font-mono text-[11px]">{s.initial_storage_entry_time}</span>
                                                        </div>
                                                    )}
                                                    {s.updated_storage_entry_time && (
                                                        <div className="col-span-2">
                                                            <span className="text-slate-400 font-medium block">Entry Synchronized</span>
                                                            <span className="font-mono text-[11px]">{s.updated_storage_entry_time}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Tab 5: Technical */}
                            {activeTab === "technical" && (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3.5">System Abstractions</h3>
                                    <div className="grid grid-cols-2 gap-y-3.5 text-sm">
                                        <div>
                                            <span className="text-xs text-slate-400 font-medium block">Prometheus Status</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                details.prometheus_status === "active" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20" : "bg-red-100 text-red-600 dark:bg-red-950/20"
                                            }`}>{details.prometheus_status || "Inactive"}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-medium block">Live Proxmox Status</span>
                                            <span className="text-xs font-semibold">{details.live_status ? "Active Connections" : "Offline / Stalled"}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-medium block">DCV Hostname</span>
                                            <span className="font-mono text-xs">{details.dcv_hostname || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-medium block">Chipset Architecture</span>
                                            <span className="font-mono text-xs capitalize">{details.chipset || "Standard Q35"}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-xs text-slate-400 font-medium block">Request Source Reference</span>
                                            <span className="text-xs font-mono font-medium">{details.request_source || "Manual Synced SyncCenter"}</span>
                                        </div>
                                        {details.software_installed && (
                                            <div className="col-span-2">
                                                <span className="text-xs text-slate-400 font-medium block">System Software Packages</span>
                                                <p className="text-xs mt-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 font-mono break-all">{details.software_installed}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VmDrawer;
