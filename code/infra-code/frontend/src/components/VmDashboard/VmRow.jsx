import React, { useState, useEffect } from "react";
import proxmoxApi from "../../api/proxmoxapi";
import DetailCard from "./DetailCard";
import StorageList from "./StorageList";
import UserList from "./UserList";
import { UserPlus, UserMinus } from "lucide-react";

const VmRow = ({ vm, serialNumber, onAddUser, onRemoveUser, globalExpand, canManageUsers }) => {
    const [expanded, setExpanded] = useState(false);
    const [details, setDetails] = useState(null);
    // const [loading, setLoading] = useState(false);
    // const [error, setError] = useState("");

    const fetchDetails = async () => {
        try {
            const res = await proxmoxApi.get(`/proxmox/vms/vmData/${vm.vm_uuid}`);
            setDetails(res.data);
        } catch (error) {
            // setError(error);
            console.error("Error fetching details", error);
        }
    };

    const toggleExpand = () => {
        setExpanded(!expanded);
        fetchDetails();
    }

    useEffect (() => {
        const handleEvent = () => {
            fetchDetails();
        };

        window.addEventListener("post request made on /proxmox/vms/<uuid>/addUsers", handleEvent);

        return () => window.removeEventListener("post request made on /proxmox/vms/<uuid>/addUsers", handleEvent);
    }, []);

    useEffect (() => {
        const handleEvent = () => {
            fetchDetails();
        };

        window.addEventListener("post request made on /proxmox/vms/<uuid>/removeUsers", handleEvent);

        return () => window.removeEventListener("post request made on /proxmox/vms/<uuid>/removeUsers", handleEvent);
    }, []);

    useEffect(() => {
        setExpanded(globalExpand);
        if (globalExpand) {
            fetchDetails();
        }
    }, [globalExpand]);

    // useEffect(() => {
    //     if (!expanded) return;
    //     if (details) return;

    //     fetchDetails();
    // }, [expanded]);


    return (
        <>
            {/*-----------MAIN ROW-------------*/}
            <tr onClick = {toggleExpand} className = "cursor-pointer transition duration-150 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 font-medium text-slate-500 dark:text-slate-500 text-center">{serialNumber}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 font-mono text-slate-800 dark:text-slate-200">{vm.vm_id}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 font-semibold text-slate-950 dark:text-slate-50">{vm.vm_name}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80">{vm.cluster_name}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80">{vm.node_name}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 font-mono">{vm.vm_ip}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 font-mono text-xs">{vm.vm_mac}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 text-center">{vm.vm_cpu}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 text-center">{vm.vm_max_mem}</td>
                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 text-center">{vm.vm_max_disk}</td>

                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 text-center capitalize">
                    {vm.vm_gpu ? "gpu" : "no gpu"}
                </td>

                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 text-center">
                    <span className = {`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                        vm.status === "running" 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)] dark:shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                          : vm.status === "stopped" 
                            ? "bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50" 
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)] dark:shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                    }`}
                    >{vm.status}</span>
                </td>

                <td className = "p-3 border-b border-slate-100 dark:border-slate-800/80 text-left" onClick={(e) => e.stopPropagation()}>
                    <div className = "flex items-center gap-3">
                        <div className = "relative group inline-block">
                            {/* Add user */}
                            <button type = "button"
                                className = "p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition border border-blue-100/30 dark:border-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                                disabled = {!canManageUsers}
                                onClick = {(e) => {
                                    e.stopPropagation();
                                    if (!canManageUsers) return;
                                    onAddUser(vm);
                                }}
                            >
                                <UserPlus size={15} />
                            </button>

                            <div className = "absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 dark:bg-slate-950 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 shadow-md">
                                Add user
                            </div>
                        </div>
                        
                        <div className = "relative group inline-block">
                            {/* Remove user */}
                            <button type = "button"
                                className = "p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 transition border border-rose-100/30 dark:border-rose-900/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                                disabled = {!canManageUsers}
                                onClick = {(e) => {
                                    e.stopPropagation();
                                    if (!canManageUsers) return;
                                    onRemoveUser(vm);
                                }}
                            >
                                <UserMinus size={15} />
                            </button>

                            <div className = "absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 dark:bg-slate-950 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 shadow-md">
                                Remove user
                            </div>
                        </div>
                    </div>
                </td>
            </tr>


            {/*-----------EXPANDED ROW----------*/}
            {expanded && (
                <tr>
                    <td colSpan = "13" className = "p-5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                        {/* {loading && (
                            <div className = "text-gray-500 text-sm">Loading details...</div>
                        )} */}

                        {/* {error && (
                            <div className = "text-red-500 text-sm mb-2">{error}</div>
                        )} */}

                        {details && (
                            <div className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {/* VM iNTERNAL DETAILS */}
                                <DetailCard
                                    title = "VM Details"
                                    data = {{
                                        uuid: details.vm_uuid,
                                        vm_name: details.vm_name,
                                        vm_host_name: details.vm_host_name,
                                        vm_id: details.vm_id,
                                        cpus: details.cpus,
                                        sockets: details.sockets,
                                        max_memory: details.max_memory,
                                        chipset: details.chipset,
                                        max_disk: details.max_disk,
                                        os: details.os,
                                        mac: details.mac,
                                        ip: details.ip,
                                        status: details.status,
                                        uptime: details.uptime,
                                        gpu: details.gpu ? "gpu" : "no gpu",
                                        gpu_details: details.gpu_info ? details.gpu_info : "",
                                        live_status: details.live_status ? "live" : "stopped",
                                        created_date: details.created_date,
                                        request_source: details.request_source ? details.request_source : "",
                                        com_focal_point: details.com_focal_point ? details.com_focal_point : "",
                                        dcv_hostname: details.dcv_hostname ? details.dcv_hostname : "",
                                        end_user_focal_point: details.end_user_focal_point ? details.end_user_focal_point : "",
                                        display_type: details.display_type ? details.display_type : "",
                                        prometheus_status: details.prometheus_status ? details.prometheus_status : "",
                                        software_installed: details.software_installed ? details.software_installed : "",
                                    }}
                                    expanded = {expanded}
                                />

                                {/* CURRENT NODE INFO */}
                                <DetailCard
                                    title = "Node Info"
                                    data = {{
                                        cluster_name: details.cluster_name,
                                        node_name: details.node_name,
                                        initial_node_entry_time: details.initial_node_entry_time,
                                        updated_node_entry_time: details.updated_node_entry_time,
                                    }}
                                    expanded = {expanded}
                                />

                                {/* STORAGE LIST */}
                                <StorageList storages = {details.storages} expanded = {expanded}/>

                                {/* USER LIST */}
                                <UserList users = {details.user_info} expanded = {expanded}/>
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
};

export default VmRow;