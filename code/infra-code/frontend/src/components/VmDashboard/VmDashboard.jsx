import React, { useEffect, useState } from "react";
import { notifyPostMade, notifyRemovePostMade } from "../eventHelpers";
import proxmoxApi from "../../api/proxmoxapi";
import webApi from "../../api/webapi";
import VmRow from "./VmRow";
import Loader from "../Loader";
import AddUserModal from "./AddUserModal";
import RemoveUserModal from "./RemoveUserModal";
import ReportPopup from "../ReportPopup";

const VmDashboard = () => {
    const user = JSON.parse(localStorage.getItem("user")) || { staff_code: "N/A", role: "view_only" };
    let role = user.role;
    if (role === "view_only") {
        if (user.staff_code === "manager") {
            role = "manager";
        } else {
            role = "user";
        }
    }
    const staffCode = user.staff_code;
    const canManageUsers = role === "admin";

    const [vms, setVms] = useState([]);
    const [assignedVmUuids, setAssignedVmUuids] = useState([]);
    const [sortKey, setSortKey] = useState("vm_id");
    const [search, setSearch] = useState("");
    const [searchField, setSearchField] = useState("");
    const [expandAll, setExpandAll] = useState(false);
    //const [syncing, setSyncing] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [sortAsc, setSortAsc] = useState(true);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [selectedVm, setSelectedVm] = useState(null);
    const [showRemoveUserModal, setShowRemoveUserModal] = useState(false);
    const [removeVm, setRemoveVm] = useState(null);
    //const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState("");

    const FIXED_FIELDS = [
        { key: "vm_id", label: "VM ID" },
        { key: "vm_name", label: "VM Name" },
    ];
    const REPORT_FIELDS = [
        { key: "vm_host_name", label: "Vm Host Name" },
        { key: "vm_uuid", label: "UUID" },
        { key: "os", label: "OS" },
        { key: "cpus", label: "CPUs" },
        { key: "sockets", label: "Socket" },
        { key: "chipset", label: "Chipset" },
        { key: "max_memory", label: "Max Memory" },
        { key: "max_disk", label: "Max Disk" },
        { key: "cluster_name", label: "Cluster" },
        { key: "node_name", label: "Node Name" },
        { key: "initial_node_entry_time", label: "Node Entry Initial" },
        { key: "updated_node_entry_time", label: "Node Entry Updated" },
        { key: "ip", label: "IP Address" },
        { key: "mac", label: "MAC Address" },
        { key: "gpu", label: "GPU" },
        { key: "gpu_info", label: "GPU Details" },
        { key: "status", label: "Status" },
        { key: "live_status", label: "Live Status" },
        { key: "uptime", label: "Uptime" },
        { key: "users_assigned", label: "Users Assigned" },
        { key: "storages", label: "Storage" },
        { key: "request_source", label: "Request Source" },
        { key: "created_date", label: "Created Date" },
        { key: "com_focal_point", label: "COM Focal Point" },
        { key: "dcv_hostname", label: "DCV Hostname" },
        { key: "end_user_focal_point", label: "End User Focal Point" },
        { key: "display_type", label: "Display Type" },
        { key: "prometheus_status", label: "Prometheus Status" },
        { key: "software_installed", label: "Software Installed" },
    ];

    // data
    const fetchVmsData = async () => {
        try {
            const response = await proxmoxApi.get("/proxmox/vms/vmData");
            let proxmoxVms = response.data;

            if (role === "user") {
                // Fetch user's registered VMs from webApi
                const regRes = await webApi.get("/vms");
                const userRegisteredVms = regRes.data.filter(vm => 
                    vm.users && vm.users.some(u => u.staff_code === staffCode)
                );
                // Create a Set of allowed names, UUIDs, and Proxmox IDs
                const allowedNames = new Set(userRegisteredVms.map(vm => vm.vm_name?.toLowerCase()));
                const allowedUuids = new Set(userRegisteredVms.map(vm => vm.vm_uuid?.toLowerCase()));
                const allowedIds = new Set(userRegisteredVms.map(vm => vm.vm_id?.toString()));

                // Filter Proxmox VMs
                proxmoxVms = proxmoxVms.filter(vm => {
                    const matchesName = vm.vm_name && allowedNames.has(vm.vm_name.toLowerCase());
                    const matchesUuid = vm.vm_uuid && allowedUuids.has(vm.vm_uuid.toLowerCase());
                    const matchesId = vm.vm_id && allowedIds.has(vm.vm_id.toString());
                    return matchesName || matchesUuid || matchesId;
                });

                // Extract and store the assigned VM UUIDs for report querying
                const uuids = userRegisteredVms.map(vm => vm.vm_uuid).filter(Boolean);
                setAssignedVmUuids(uuids);
            }

            setVms(proxmoxVms);
        } catch (err) {
            console.error("Failed to fetch VM data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVmsData();
    }, []);

    useEffect(() => {
        const handleVmRefresh = () => {
            fetchVmsData();
        }

        window.addEventListener("post request made on /proxmox/vms/sync", handleVmRefresh);

        return () => {
            window.removeEventListener("post request made on /proxmox/vms/sync", handleVmRefresh);
        };
    }, []);

    // SYNCING LOGIC
    const showToast = (type, message) => {
        const id = Date.now();
        // console.log("TOAST: ", type, message);

        setToasts((prev) => [{ id, type, message }, ...prev]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    // FILTERING LOGIC
    const filteredVms = vms.filter((vm) => {
        const value = vm[searchField];
        if (!searchField) return true;
        if (!search) return true;
        if (value === undefined || value === null) return false;
        return value.toString().toLowerCase().includes(search.toLowerCase());
    });

    // SORTING LOGIC
    const sortedVms = [...filteredVms].sort((a, b) => {
        const valA = a[sortKey] ?? "";
        const valB = b[sortKey] ?? "";
        if (typeof valA === "number" && typeof valB === "number") {
            return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc ? valA.toString().localeCompare(valB.toString()) : valB.toString().localeCompare(valA.toString());
    });

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;

    const currentVms = sortedVms.slice(indexOfFirst, indexOfLast);

    const totalPages = Math.ceil(sortedVms.length / itemsPerPage);

    const getPageNumbers = (currentPage, totalPages) => {
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        pages.push(1);

        if (currentPage > 3) pages.push("...");

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) pages.push(i);

        if (currentPage < totalPages - 2) pages.push("...");

        pages.push(totalPages);

        return pages;
    };

    const handleDownload = async () => {
        try {
            const format = selectedFormat || "csv";

            const fixedKeys = ["vm_id", "vm_name"];

            let columnsToSend = null;
            if (selectedColumns.length > 0) {
                columnsToSend = Array.from(new Set([...fixedKeys, ...selectedColumns]));
            }

            const payload = {
                columns: columnsToSend,
                format: format === "pdf" ? "pdf" : format
            };
            if (role === "user") {
                payload.uuids = assignedVmUuids;
            }

            if (format === "pdf") {
                const response = await proxmoxApi.post(
                    "/proxmox/report",
                    payload,
                    { responseType: "blob" }
                );

                const blob = new Blob([response.data], { type: "text/html" });
                const url = window.URL.createObjectURL(blob);

                window.open(url, "_blank");
                setTimeout(() => window.URL.revokeObjectURL(url), 5000);

                setShowPopup(false);
                return;
            }

            const response = await proxmoxApi.post(
                "/proxmox/report",
                payload,
                { responseType: "blob" }
            );

            const blob = new Blob([response.data], {
                type: response.headers["content-type"],
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            link.download = `vm-report.${format}`;
            link.click();

            window.URL.revokeObjectURL(url);
            setShowPopup(false);
        } catch (err) {
            try {
                const text = await err?.response?.data?.text();
                console.error("Download failed:", text || err);
            } catch {
                console.error("Download failed:", err);
            }
        }
    };


    // LOADING
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
                <Loader text="Loading VMs..." />
            </div>
        );
    }

    // RENDER
    return (
        <div className="min-h-screen px-0 pt-0 pb-10">
            {/*  TOAST CONTAINER  */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 items-end">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`flex items-center gap-3 min-w-[320px] px-5 py-3 rounded-lg shadow-lg text-white animate-slide-in ${toast.type === "success" ? "bg-green-500" : toast.type === "error" ? "bg-red-500" : "bg-blue-500"}`}>
                        <span className="text-xl leading-none">
                            {toast.type === "success" && "✔"}
                            {toast.type === "error" && "✖"}
                            {toast.type === "info" && "ℹ"}
                        </span>
                        <span className="font-medium text-sm break-words">{toast.message}</span>
                    </div>
                ))}
            </div>

            <h1 className="text-center text-slate-700 font-bold text-3xl mt-5 mb-5 tracking-tight">
                {role === "user" ? "My Virtual Machines" : "Virtual Machine Dashboard"}
            </h1>

            {/* Controls Row */}
            <div className="flex flex-row items-center justify-between gap-4 mb-4 px-8">
                <div className="flex flex-row items-center gap-3">
                    {/*-----------FIELD SELECTOR OPTION---------*/}
                    <div className="flex items-center bg-white rounded-lg border border-blue-300 focus-within:border-blue-500 focus-within:shadow-md px-2 py-1.5 transition min-w-[240px]">
                        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center mr-2 text-white">
                            <svg fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5">
                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="flex-1 border-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none min-w-[140px]">
                            <option value="">---select filter---</option>
                            <option value="vm_id">VM Id</option>
                            <option value="vm_uuid">VM Uuid</option>
                            <option value="vm_name">VM Name</option>
                            <option value="vm_host_name">VM Host Name</option>
                            <option value="vm_ip">VM Ip</option>
                            <option value="vm_mac">VM Mac</option>
                            <option value="cluster_name">Cluster name</option>
                            <option value="node_name">Node name</option>
                            <option value="status">Status</option>
                            <option value="vm_created_date">Creation Time</option>
                        </select>
                    </div>

                    {/*-----------SEARCH BOX--------*/}
                    <div className="flex items-center bg-white rounded-lg border border-blue-300 focus-within:border-blue-500 focus-within:shadow-md px-2 py-1.5 transition min-w-[240px]">
                        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center mr-2 text-white">
                            <svg fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input type="text" placeholder="Search VM..." disabled={!searchField} className={`flex-1 border-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none min-w-[180px] ${!searchField ? "cursor-not-allowed" : ""}`} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="flex flex-row items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer select-none text-slate-700 text-sm font-medium" onClick={() => setExpandAll(!expandAll)}>
                        <input type="checkbox" checked={expandAll} onChange={(e) => setExpandAll(e.target.checked)} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        <span>{expandAll ? "Collapse All" : "Expand All"}</span>
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowPopup(true)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/10 dark:shadow-emerald-950/20 transition">
                            Download Report
                        </button>
                        {showPopup && (
                            <ReportPopup
                                availableColumns={REPORT_FIELDS}
                                selectedColumns={selectedColumns}
                                setSelectedColumns={setSelectedColumns}
                                selectedFormat={selectedFormat}
                                setSelectedFormat={setSelectedFormat}
                                onClose={() => setShowPopup(false)}
                                onDownload={handleDownload}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/*---------------TABLE-------------*/}
            <div className="overflow-hidden rounded-2xl mx-8 border border-slate-200 dark:border-slate-800 shadow-lg">
                <table className="w-full border-collapse text-[13px] table-fixed bg-white dark:bg-slate-900/40">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            {[
                                { key: "serial", label: "Sl. No." },
                                { key: "vm_id", label: "VM Id" },
                                { key: "vm_name", label: "VM Name" },
                                { key: "cluster_name", label: "Cluster" },
                                { key: "node_name", label: "Node" },
                                { key: "vm_ip", label: "IP" },
                                { key: "vm_mac", label: "MAC" },
                                { key: "vm_cpu", label: "CPUs" },
                                { key: "vm_max_mem", label: "Max Mem (in GiB)" },
                                { key: "vm_max_disk", label: "Max Disk (in GiB)" },
                                { key: "vm_gpu", label: "Gpu status" },
                                { key: "status", label: "Status" },
                            ].map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => {
                                        if (sortKey === col.key) setSortAsc(!sortAsc);
                                        else { setSortKey(col.key); setSortAsc(true); }
                                    }}
                                    className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-350 whitespace-nowrap cursor-pointer select-none overflow-hidden text-ellipsis"
                                >
                                    {col.label}{" "}
                                    {sortKey === col.key ? (sortAsc ? "▲" : "▼") : ""}
                                </th>
                            ))}
                            <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-350 whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>

                    <tbody >
                        {currentVms.map((vm, index) => (
                            <VmRow
                                key={vm.vm_uuid}
                                vm={vm}
                                serialNumber={indexOfFirst + index + 1}
                                onAddUser={() => {
                                    if (!canManageUsers) return;
                                    setSelectedVm(vm);
                                    setShowAddUserModal(true);
                                }}
                                onRemoveUser={() => {
                                    if (!canManageUsers) return;
                                    setRemoveVm(vm);
                                    setShowRemoveUserModal(true);
                                }}
                                globalExpand={expandAll}
                                canManageUsers={canManageUsers}
                                rowClassName="transition hover:bg-blue-50"
                                cellClassName="px-3 py-2 border-b border-slate-200 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis"
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/*-------PAGINATION CONTROLS----------*/}
            <div className="flex flex-row items-center justify-between mt-5 gap-4 px-8">
                <div className="flex items-center gap-2 text-slate-700 text-base font-medium">
                    <span>Rows per page:</span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }} className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none transition">
                        {[5, 10, 20, 50, 100].map((num) => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-slate-500 font-medium">
                    Showing {sortedVms.length === 0 ? 0 : indexOfFirst + 1} to {Math.min(indexOfLast, sortedVms.length)} of {sortedVms.length} VMs
                </div>
                <div className="flex items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium transition hover:bg-blue-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                    {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                        p === "..." ? (
                            <span key={idx} className="px-2 text-gray-500">...</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                className={`px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium transition hover:bg-blue-500 hover:text-white ${currentPage === p ? "border-blue-500 text-blue-600 ring-2 ring-blue-200" : ""}`}
                                style={{ minWidth: 40 }}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((p) => p + 1)} className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium transition hover:bg-blue-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                        Next
                    </button>
                </div>
            </div>

            {showAddUserModal && (
                <AddUserModal vm={selectedVm} onClose={() => setShowAddUserModal(false)}
                    onSubmit={(userForms) => {
                        const payload = {
                            users: userForms.map(u => ({
                                staff_code: u.staff_code,
                                name: u.name,
                                entity: u.entity,
                                group: u.group,
                                division: u.division
                            }))
                        };

                        proxmoxApi.post(`/proxmox/vms/${selectedVm.vm_uuid}/addUsers`, payload)
                            .then(() => {
                                notifyPostMade();
                                showToast("success", "Users added successfully");
                                setShowAddUserModal(false);

                                fetchVmsData();
                            })
                            .catch(() => {
                                showToast("error", "Failed to add users! Check logs");
                            });
                    }}
                />
            )}

            {showRemoveUserModal && (
                <RemoveUserModal vm={removeVm} onClose={() => { setShowRemoveUserModal(false); setRemoveVm(null); }}
                    onRemoved={() => {
                        notifyRemovePostMade();
                        showToast("success", "Users removed successfully");
                    }}
                />
            )}
        </div>
    );
};

export default VmDashboard;