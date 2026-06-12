import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import webApi from "../api/webapi";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import { Monitor, Cpu, HardDrive, Shield } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";


const objToLabelsValues = (obj = {}) => ({
    labels: Object.keys(obj),
    values: Object.values(obj),
});

const aggregateCounts = (data, selectedCluster, selectedNodes) => {
    const result = {};
    if (!data) return result;

    const clusters = selectedCluster ? [selectedCluster] : Object.keys(data);

    clusters.forEach((cluster) => {
        const nodes = data[cluster] || {};
        const nodesToUse = selectedNodes?.length ? selectedNodes : Object.keys(nodes);

        nodesToUse.forEach((node) => {
            const keys = nodes[node] || {};
            Object.entries(keys).forEach(([key, value]) => {
                result[key] = (result[key] || 0) + value;
            });
        });
    });

    return result;
};

const prettyLabel = (key) => {
    const labels = { "0": "0 GPU", "1": "1 GPU", false: "False", true: "True" };
    return labels[key] || key;
};

const getClusters = (vizData) => Object.keys(vizData?.cluster || {});

const getNodesForCluster = (vizData, categoryKey, clusterName) =>
    Object.keys(vizData?.[categoryKey]?.[clusterName] || {});

const DonutChart = ({ centerLabel, footerTitle, dataObj }) => {
    const { currentTheme } = useTheme();
    const isDark = currentTheme === "dark";
    const { labels, values } = objToLabelsValues(dataObj);
    const total = values.reduce((a, b) => a + b, 0);
    const [selectedSlice, setSelectedSlice] = useState(null);

    const handleSliceClick = (event) => {
        const sliceIndex = event.points[0].pointIndex;
        setSelectedSlice(sliceIndex === selectedSlice ? null : sliceIndex);
    };

    const pullValues = labels.map((_, index) => (index === selectedSlice ? 0.15 : 0));

    return (
        <div className="rounded-xl">
            <div className="flex justify-center items-center w-full h-[300px] relative overflow-hidden">
                {total > 0 ? (
                    <Plot
                        data={[{
                            type: "pie",
                            hole: 0.55,
                            labels: labels.map(prettyLabel),
                            values,
                            textinfo: "percent",
                            hovertemplate: "%{label}<br>%{value} (vms)<br>%{percent}<extra></extra>",

                            automargin: true,
                            pull: pullValues,
                            marker: {
                                colors: ["#009d2aff","#ff550cff", "#070991ff","#9e0466ff", "#FFC107"],
                                line: {
                                    color: isDark ? "#1e293b" : "#fff",
                                    width: 2,
                                },
                            },
                        }]}
                        layout={{
                            autosize: true,
                            margin: { t: 10, b: 30, l: 10, r: 10 },
                            showlegend: true,
                            legend: {
                                orientation: "v",
                                x: 1.05,
                                y: 1,
                                font: { size: 12, color: isDark ? "#cbd5e1" : "#475569" },
                            },
                            paper_bgcolor: "transparent",
                            plot_bgcolor: "transparent",
                            annotations: [
                                {
                                    text: `<b>${centerLabel}</b><br>${total} (VMs)`,
                                    font: { size: 18, color: isDark ? "#f8fafc" : "#333" },
                                    showarrow: false,
                                    x: 0.5,
                                    y: 0.5,
                                    xref: "paper",
                                    yref: "paper",
                                },
                            ],
                            transition: {
                                duration: 300,
                                easing: "cubic-in-out",
                            },
                        }}
                        useResizeHandler
                        style={{ width: "100%", height: "100%" }}
                        config={{ displayModeBar: false, responsive: true }}
                        onClick={handleSliceClick}
                    />
                ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500 border border-dashed border-gray-300 dark:border-slate-800 rounded-xl w-full">No Data</div>
                )}
            </div>
            <div className="text-center font-bold mt-2 text-[15px] text-slate-800 dark:text-slate-200">{footerTitle}</div>
        </div>
    );
};

const ClusterSelect = ({ title, clusters, value, onChange }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-gray-800 dark:text-slate-350">{title}</label>
        <select className="px-2.5 py-2 rounded-lg border border-gray-300 dark:border-slate-700 outline-none bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" value={value} onChange={onChange}>
            <option value="">All Clusters</option>
            {clusters.map((c) => (
                <option key={c} value={c}>{c}</option>
            ))}
        </select>
    </div>
);

const NodeMultiSelectInteractive = ({ title, nodes, value, setValue, disabled }) => {
    const [open, setOpen] = useState(false);

    const toggleOption = (node) => {
        setValue(value.includes(node)
            ? value.filter((n) => n !== node)
            : [...value, node]
        );
    };

    const handleOutsideClick = (event) => {
        if (!event.target.closest(".multiSelect")) {
            setOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("click", handleOutsideClick);
        return () => {
            document.removeEventListener("click", handleOutsideClick);
        };
    }, []);

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-gray-800 dark:text-slate-350">{title}</label>
            {disabled ? (
                <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 text-[13px]">Select cluster first</div>
            ) : (
                <div className="relative multiSelect">
                    <button
                        type="button"
                        className="flex justify-between items-center px-2.5 py-2 text-[14px] font-medium text-gray-850 dark:text-slate-200 bg-gray-50 dark:bg-slate-850 border border-gray-300 dark:border-slate-700 rounded-md w-full cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition"
                        onClick={() => setOpen(!open)}
                    >
                        {value.length > 0 ? `${value.length} node(s) selected` : "Choose nodes"}
                        <span className={`ml-2 text-xs text-gray-500 ${open ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {open && (
                        <div className="absolute top-12 left-0 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-850 rounded-xl p-2 z-20 shadow-lg max-h-44 overflow-y-auto">
                            {nodes.map((node) => (
                                <label key={node} className="flex gap-2 items-center px-2 py-1.5 rounded-lg cursor-pointer text-[14px] text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                                    <input
                                        type="checkbox"
                                        checked={value.includes(node)}
                                        onChange={() => toggleOption(node)}
                                        className="accent-blue-500"
                                    />
                                    <span>{node}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                        {value.map((v) => (
                            <span key={v} className="flex items-center px-2 py-1 text-xs bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/40 dark:border-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full">
                                {v}
                                <button
                                    className="ml-1 text-xs text-blue-400 hover:text-blue-600 dark:text-blue-500"
                                    onClick={() => setValue(value.filter((x) => x !== v))}
                                >×</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function VisualizationDashboard() {
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

    const [assignedVms, setAssignedVms] = useState([]);
    const [userLoading, setUserLoading] = useState(true);

    useEffect(() => {
        if (role !== "user") return;
        
        const fetchUserData = async () => {
            try {
                setUserLoading(true);
                const res = await webApi.get("/vms");
                const filtered = res.data.filter(vm => 
                    vm.users && vm.users.some(u => u.staff_code === staffCode)
                );
                setAssignedVms(filtered);
            } catch (err) {
                console.error("Failed to load user dashboard VMs", err);
            } finally {
                setUserLoading(false);
            }
        };

        fetchUserData();
    }, [role, staffCode]);

    const [vizData, setVizData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [gpuCluster, setGpuCluster] = useState("");
    const [gpuNodes, setGpuNodes] = useState([]);

    const [narcCluster, setNarcCluster] = useState("");
    const [narcNodes, setNarcNodes] = useState([]);

    const [nodeCluster, setNodeCluster] = useState("");

    const [osCluster, setOsCluster] = useState("");
    const [osNodes, setOsNodes] = useState([]);

    const [statusCluster, setStatusCluster] = useState("");
    const [statusNodes, setStatusNodes] = useState([]);

    useEffect(() => {
        if (role === "user") return;
        setLoading(true);
        fetch("/api/proxmox/proxmox/visualization")
            .then((res) => res.json())
            .then((data) => {
                setVizData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("API error:", err);
                setLoading(false);
            });
    }, [role]);

    const clusters = useMemo(() => getClusters(vizData), [vizData]);

    const gpuNodeOptions = useMemo(
        () => getNodesForCluster(vizData, "gpu", gpuCluster),
        [vizData, gpuCluster]
    );
    const narcNodeOptions = useMemo(
        () => getNodesForCluster(vizData, "request_source", narcCluster),
        [vizData, narcCluster]
    );
    const osNodeOptions = useMemo(
        () => getNodesForCluster(vizData, "os", osCluster),
        [vizData, osCluster]
    );
    const statusNodeOptions = useMemo(
        () => getNodesForCluster(vizData, "status", statusCluster),
        [vizData, statusCluster]
    );

    // Reset selected nodes when cluster changes
    useEffect(() => setGpuNodes([]), [gpuCluster]);
    useEffect(() => setNarcNodes([]), [narcCluster]);
    useEffect(() => setOsNodes([]), [osCluster]);
    useEffect(() => setStatusNodes([]), [statusCluster]);

    const clusterCounts = vizData?.cluster || {};

    const gpuCounts = aggregateCounts(vizData?.gpu, gpuCluster, gpuNodes);
    const narcCounts = aggregateCounts(vizData?.request_source, narcCluster, narcNodes);

    const nodeCounts = aggregateCounts(vizData?.node, nodeCluster);

    const osCounts = aggregateCounts(vizData?.os, osCluster, osNodes);
    const statusCounts = aggregateCounts(vizData?.status, statusCluster, statusNodes);

    if (role === "user") {
        if (userLoading) {
            return (
                <div className="flex justify-center items-center h-screen text-slate-600 dark:text-slate-400">
                    <Loader text="Loading your dashboard KPIs..." />
                </div>
            );
        }

        const totalCount = assignedVms.length;
        const totalCores = assignedVms.reduce((acc, curr) => acc + (Number(curr.cores) || 0), 0);
        const totalRam = assignedVms.reduce((acc, curr) => acc + (Number(curr.ram) || 0), 0);
        const totalDisk = assignedVms.reduce((acc, curr) => acc + (Number(curr.disk_size) || 0), 0);

        const statusCounts = {};
        assignedVms.forEach(vm => {
            const st = (vm.status || "stopped").toLowerCase();
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        const vmNames = assignedVms.map(vm => vm.vm_name || "Unnamed");
        const vmCores = assignedVms.map(vm => Number(vm.cores) || 0);
        const vmRam = assignedVms.map(vm => Number(vm.ram) || 0);
        const vmDisk = assignedVms.map(vm => Number(vm.disk_size) || 0);

        return (
            <div className="p-6 font-sans min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#0B1220] dark:to-[#0d1627] text-slate-800 dark:text-slate-100">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Personal resources allocation overview and VM statuses for staff code: <span className="font-bold text-slate-700 dark:text-slate-350">{staffCode}</span></p>
                </div>

                {assignedVms.length === 0 ? (
                    <Card className="text-center py-12 text-slate-500 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800">
                        <div className="text-lg font-semibold mb-2">No Virtual Machines Assigned</div>
                        <p className="text-sm">You currently don't have any registered VMs linked to your staff profile code.</p>
                    </Card>
                ) : (
                    <>
                        {/* KPI Cards Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                            <Card className="flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <Monitor size={22} />
                                </div>
                                <div>
                                    <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned VMs</div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalCount}</div>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Cpu size={22} />
                                </div>
                                <div>
                                    <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Allocated Cores</div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalCores}</div>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    <HardDrive size={22} />
                                </div>
                                <div>
                                    <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Allocated RAM</div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalRam} <span className="text-xs font-normal text-slate-500">GB</span></div>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Allocated Disk</div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalDisk} <span className="text-xs font-normal text-slate-500">GB</span></div>
                                </div>
                            </Card>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* VM Status Chart */}
                            <Card className="bg-white/75 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/50 p-4">
                                <h3 className="font-bold text-[16px] text-slate-800 dark:text-slate-100 mb-4">VM Status Distribution</h3>
                                <div className="h-[300px] w-full relative overflow-hidden flex items-center justify-center">
                                    <Plot
                                        data={[{
                                            type: "pie",
                                            hole: 0.5,
                                            labels: Object.keys(statusCounts).map(s => s.toUpperCase()),
                                            values: Object.values(statusCounts),
                                            textinfo: "percent+value",
                                            marker: {
                                                colors: ["#10B981", "#EF4444", "#64748B"]
                                            }
                                        }]}
                                        layout={{
                                            autosize: true,
                                            margin: { t: 20, b: 20, l: 20, r: 20 },
                                            showlegend: true,
                                            legend: { orientation: "h", y: -0.1 },
                                            paper_bgcolor: "transparent",
                                            plot_bgcolor: "transparent",
                                            font: { color: "#64748B" }
                                        }}
                                        useResizeHandler
                                        style={{ width: "100%", height: "100%" }}
                                        config={{ displayModeBar: false, responsive: true }}
                                    />
                                </div>
                            </Card>

                            {/* Resource Allocation Footprint */}
                            <Card className="bg-white/75 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/50 p-4">
                                <h3 className="font-bold text-[16px] text-slate-800 dark:text-slate-100 mb-4">Resource Allocation Footprint</h3>
                                <div className="h-[300px] w-full relative overflow-hidden flex items-center justify-center">
                                    <Plot
                                        data={[
                                            {
                                                type: "bar",
                                                name: "Cores",
                                                x: vmNames,
                                                y: vmCores,
                                                marker: { color: "#3B82F6" }
                                            },
                                            {
                                                type: "bar",
                                                name: "RAM (GB)",
                                                x: vmNames,
                                                y: vmRam,
                                                marker: { color: "#10B981" }
                                            },
                                            {
                                                type: "bar",
                                                name: "Disk (GB)",
                                                x: vmNames,
                                                y: vmDisk,
                                                marker: { color: "#F59E0B" }
                                            }
                                        ]}
                                        layout={{
                                            autosize: true,
                                            barmode: "group",
                                            margin: { t: 20, b: 40, l: 40, r: 20 },
                                            paper_bgcolor: "transparent",
                                            plot_bgcolor: "transparent",
                                            font: { color: "#64748B" },
                                            xaxis: { gridcolor: "transparent" },
                                            yaxis: { gridcolor: "rgba(100, 116, 139, 0.1)" }
                                        }}
                                        useResizeHandler
                                        style={{ width: "100%", height: "100%" }}
                                        config={{ displayModeBar: false, responsive: true }}
                                    />
                                </div>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (loading) return <div className="p-6 font-sans bg-[#f6f7fb] dark:bg-[#0B1220] text-slate-800 dark:text-slate-200 min-h-screen"><h2>Loading charts...</h2></div>;
    if (!vizData) return <div className="p-6 font-sans bg-[#f6f7fb] dark:bg-[#0B1220] text-slate-800 dark:text-slate-200 min-h-screen"><h2>No data found</h2></div>;

    // Last updated info box (top right)
    const lastUpdated = new Date(vizData.updated_at);
    const formattedDate = lastUpdated.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const formattedTime = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <div className="p-6 font-sans min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-[#0B1220] dark:to-[#0d1627] text-slate-800 dark:text-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="m-0 mb-0 text-[28px] font-bold text-slate-900 dark:text-white">VM Visualization Dashboard</h1>
                    <div className="flex items-center gap-2 bg-[#e3ecf8] dark:bg-slate-850 text-[#162a61] dark:text-slate-200 rounded-xl border border-[#266ec6] dark:border-slate-800 px-5 py-2 text-base font-medium">
                        <span className="text-[1.2em] mr-1" role="img" aria-label="clock">🕒</span>
                        <strong>Last updated:</strong> {formattedDate}, {formattedTime}
                    </div>
                </div>

                <div className="grid gap-4" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))'}}>
                {/* 1) Cluster */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow transition hover:-translate-y-1 hover:shadow-lg text-slate-850 dark:text-slate-200">
                    <div className="mb-2"><h2 className="m-0 text-lg font-bold">Cluster</h2></div>
                    <DonutChart
                        centerLabel="Cluster"
                        footerTitle="VMs per Cluster"
                        dataObj={clusterCounts}
                    />
                </div>

                {/* 2) GPU */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow transition hover:-translate-y-1 hover:shadow-lg text-slate-850 dark:text-slate-200">
                    <div className="mb-2"><h2 className="m-0 text-lg font-bold">GPU</h2></div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <ClusterSelect
                            title="Select Cluster"
                            clusters={clusters}
                            value={gpuCluster}
                            onChange={(e) => setGpuCluster(e.target.value)}
                        />
                        <NodeMultiSelectInteractive
                            title="Select Nodes (Multi)"
                            nodes={gpuNodeOptions}
                            value={gpuNodes}
                            setValue={setGpuNodes}
                            disabled={!gpuCluster}
                        />
                    </div>
                    <DonutChart
                        centerLabel="GPU"
                        footerTitle="GPU Distribution"
                        dataObj={gpuCounts}
                    />
                </div>

                {/* 3) NARC */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow transition hover:-translate-y-1 hover:shadow-lg text-slate-850 dark:text-slate-200">
                    <div className="mb-2"><h2 className="m-0 text-lg font-bold">Request Source</h2></div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <ClusterSelect
                            title="Select Cluster"
                            clusters={clusters}
                            value={narcCluster}
                            onChange={(e) => setNarcCluster(e.target.value)}
                        />
                        <NodeMultiSelectInteractive
                            title="Select Nodes (Multi)"
                            nodes={narcNodeOptions}
                            value={narcNodes}
                            setValue={setNarcNodes}
                            disabled={!narcCluster}
                        />
                    </div>
                    <DonutChart
                        centerLabel="Sources"
                        footerTitle="Request Source Distribution"
                        dataObj={narcCounts}
                    />
                </div>

                {/* 4) Node */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow transition hover:-translate-y-1 hover:shadow-lg text-slate-850 dark:text-slate-200">
                    <div className="mb-2"><h2 className="m-0 text-lg font-bold">Node</h2></div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <ClusterSelect
                            title="Select Cluster"
                            clusters={clusters}
                            value={nodeCluster}
                            onChange={(e) => setNodeCluster(e.target.value)}
                        />
                    </div>
                    <DonutChart
                        centerLabel="Node"
                        footerTitle="VMs per Node"
                        dataObj={nodeCounts}
                    />
                </div>

                {/* 5) OS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow transition hover:-translate-y-1 hover:shadow-lg text-slate-850 dark:text-slate-200">
                    <div className="mb-2"><h2 className="m-0 text-lg font-bold">OS</h2></div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <ClusterSelect
                            title="Select Cluster"
                            clusters={clusters}
                            value={osCluster}
                            onChange={(e) => setOsCluster(e.target.value)}
                        />
                        <NodeMultiSelectInteractive
                            title="Select Nodes (Multi)"
                            nodes={osNodeOptions}
                            value={osNodes}
                            setValue={setOsNodes}
                            disabled={!osCluster}
                        />
                    </div>
                    <DonutChart
                        centerLabel="OS"
                        footerTitle="OS Distribution"
                        dataObj={osCounts}
                    />
                </div>

                {/* 6) Status */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow transition hover:-translate-y-1 hover:shadow-lg text-slate-850 dark:text-slate-200">
                    <div className="mb-2"><h2 className="m-0 text-lg font-bold">Status</h2></div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <ClusterSelect
                            title="Select Cluster"
                            clusters={clusters}
                            value={statusCluster}
                            onChange={(e) => setStatusCluster(e.target.value)}
                        />
                        <NodeMultiSelectInteractive
                            title="Select Nodes (Multi)"
                            nodes={statusNodeOptions}
                            value={statusNodes}
                            setValue={setStatusNodes}
                            disabled={!statusCluster}
                        />
                    </div>
                    <DonutChart
                        centerLabel="Status"
                        footerTitle="Status Distribution"
                        dataObj={statusCounts}
                    />
                </div>
            </div>
        </div>
    );
}
