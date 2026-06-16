import React, { useEffect, useState, useMemo } from "react";
import Plot from "react-plotly.js";
import { notifyPostMade, notifyRemovePostMade } from "../eventHelpers";
import proxmoxApi from "../../api/proxmoxapi";
import webApi from "../../api/webapi";
import VmRow from "./VmRow";
import VmDrawer from "./VmDrawer";
import Loader from "../Loader";
import AddUserModal from "./AddUserModal";
import RemoveUserModal from "./RemoveUserModal";
import ReportPopup from "../ReportPopup";
import { CPU_THRESHOLD, RAM_THRESHOLD, DISK_THRESHOLD } from "../../constants/vmThresholds";
import { useTheme } from "../../theme/ThemeProvider";
import { 
    Monitor, Play, Square, Activity, Users, ShieldAlert, BarChart2, 
    ChevronDown, ChevronUp, Download, Search, SlidersHorizontal, ArrowUpDown, X 
} from "lucide-react";

// Auditing duplicate VM names validation
const checkDuplicateNames = (proxmoxList, dbList) => {
    const pxSet = new Set();
    const dbSet = new Set();
    let hasDuplicate = false;
    let duplicateName = "";
    
    for (let v of proxmoxList) {
        if (!v.vm_name) continue;
        const name = v.vm_name.toLowerCase().trim();
        if (pxSet.has(name)) {
            hasDuplicate = true;
            duplicateName = v.vm_name;
            break;
        }
        pxSet.add(name);
    }
    
    if (!hasDuplicate) {
        for (let v of dbList) {
            if (!v.vm_name) continue;
            const name = v.vm_name.toLowerCase().trim();
            if (dbSet.has(name)) {
                hasDuplicate = true;
                duplicateName = v.vm_name;
                break;
            }
            dbSet.add(name);
        }
    }
    return { hasDuplicate, duplicateName };
};

const VmDashboard = () => {
    const { currentTheme } = useTheme();
    const user = JSON.parse(localStorage.getItem("user")) || { staff_code: "N/A", role: "user" };
    let role = user.role;
    
    // Resolve Manager vs User fallback inside view_only credentials
    if (role === "view_only") {
        role = user.staff_code === "manager" ? "manager" : "user";
    }
    const staffCode = user.staff_code;
    const canManageUsers = role === "admin";

    // VM Data States
    const [vms, setVms] = useState([]);
    const [rawVms, setRawVms] = useState([]);
    const [webVms, setWebVms] = useState([]);
    const [assignedVmUuids, setAssignedVmUuids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [validationError, setValidationError] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal Triggers & Selection
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [selectedVm, setSelectedVm] = useState(null);
    const [showRemoveUserModal, setShowRemoveUserModal] = useState(false);
    const [removeVm, setRemoveVm] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState("csv");

    // Drawer States
    const [activeDrawerVm, setActiveDrawerVm] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerCache, setDrawerCache] = useState({});

    // Filtering Ribbons & Search State
    const [search, setSearch] = useState("");
    const [quickStatus, setQuickStatus] = useState("all");
    const [quickOwnership, setQuickOwnership] = useState("all");
    const [quickResource, setQuickResource] = useState("all");
    const [filterCluster, setFilterCluster] = useState("");
    const [filterNode, setFilterNode] = useState("");
    const [filterOs, setFilterOs] = useState("");

    // Advanced Filters Toggle & Dropdown States
    const [showAdvFilters, setShowAdvFilters] = useState(false);
    const [advStatus, setAdvStatus] = useState("");
    const [advCluster, setAdvCluster] = useState("");
    const [advNode, setAdvNode] = useState("");
    const [advOs, setAdvOs] = useState("");
    const [advGpu, setAdvGpu] = useState("");
    const [advEntity, setAdvEntity] = useState("");
    const [advDivision, setAdvDivision] = useState("");
    const [advGroup, setAdvGroup] = useState("");

    // Sort Configurations
    const [sortKey, setSortKey] = useState("vm_id");
    const [sortAsc, setSortAsc] = useState(true);
    const [smartSort, setSmartSort] = useState(""); // cpu, ram, storage, gpu, recent, uptime

    // Bulk Selections State
    const [selectedVms, setSelectedVms] = useState(new Set());
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [toasts, setToasts] = useState([]);

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
        { key: "ip", label: "IP Address" },
        { key: "mac", label: "MAC Address" },
        { key: "gpu", label: "GPU" },
        { key: "status", label: "Status" },
        { key: "uptime", label: "Uptime" },
        { key: "created_date", label: "Created Date" }
    ];

    // Fetch VMs operations datasets
    const fetchVmsData = async () => {
        try {
            const [proxmoxRes, rawRes, webVmsRes] = await Promise.all([
                proxmoxApi.get("/proxmox/vms/vmData"),
                proxmoxApi.get("/proxmox/vms/"),
                webApi.get("/vms")
            ]);

            let proxmoxVms = proxmoxRes.data;
            let webVmsData = webVmsRes.data;
            let rawVmsData = rawRes.data;

            // Audit duplicate names validation
            const validation = checkDuplicateNames(proxmoxVms, webVmsData);
            if (validation.hasDuplicate) {
                setValidationError(`Dataset Invalidation: Multiple VM instances named "${validation.duplicateName}" detected. Inventory console is suspended.`);
                setLoading(false);
                return;
            }

            // Role visibility constraints
            if (role === "user") {
                const userRegisteredVms = webVmsData.filter(vm => 
                    vm.users && vm.users.some(u => u.staff_code === staffCode)
                );
                const allowedNames = new Set(userRegisteredVms.map(vm => vm.vm_name?.toLowerCase().trim()));
                const allowedUuids = new Set(userRegisteredVms.map(vm => vm.vm_uuid?.toLowerCase().trim()));
                const allowedIds = new Set(userRegisteredVms.map(vm => vm.vm_id?.toString()));

                proxmoxVms = proxmoxVms.filter(vm => {
                    const matchesName = vm.vm_name && allowedNames.has(vm.vm_name.toLowerCase().trim());
                    const matchesUuid = vm.vm_uuid && allowedUuids.has(vm.vm_uuid.toLowerCase().trim());
                    const matchesId = vm.vm_id && allowedIds.has(vm.vm_id.toString());
                    return matchesName || matchesUuid || matchesId;
                });

                const uuids = userRegisteredVms.map(vm => vm.vm_uuid).filter(Boolean);
                setAssignedVmUuids(uuids);
            }

            setVms(proxmoxVms);
            setRawVms(rawVmsData);
            setWebVms(webVmsData);
            setValidationError(null);
        } catch (err) {
            console.error("Failed to load operations center data", err);
            showToast("error", "Sync center error: Failed to connect to local database engines");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVmsData();
        const params = new URLSearchParams(window.location.search);
        const searchParam = params.get("search") || params.get("q");
        const osParam = params.get("os");
        const statusParam = params.get("status");
        const clusterParam = params.get("cluster");
        const nodeParam = params.get("node");
        
        if (searchParam) setSearch(searchParam);
        if (osParam) setFilterOs(osParam);
        if (statusParam) setQuickStatus(statusParam);
        if (clusterParam) setFilterCluster(clusterParam);
        if (nodeParam) setFilterNode(nodeParam);
    }, []);

    useEffect(() => {
        const handleVmRefresh = () => {
            fetchVmsData();
        };
        window.addEventListener("post request made on /proxmox/vms/sync", handleVmRefresh);
        return () => window.removeEventListener("post request made on /proxmox/vms/sync", handleVmRefresh);
    }, []);

    // Invalidation hooks for user modification events
    const updateDrawerCache = (uuid, data) => {
        setDrawerCache(prev => ({ ...prev, [uuid]: data }));
    };

    const showToast = (type, message) => {
        const id = Date.now();
        setToasts((prev) => [{ id, type, message }, ...prev]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    // ----------------------------------------------------
    // PERFORMANCE MEMOIZATIONS (useMemo)
    // ----------------------------------------------------

    // O(1) Database VM -> Users mappings
    const webVmsMap = useMemo(() => {
        const map = {};
        webVms.forEach(db => {
            if (db.vm_name) {
                map[db.vm_name.toLowerCase().trim()] = db.users || [];
            }
        });
        return map;
    }, [webVms]);

    // Merging uptime specs & owners onto Proxmox VM records
    const processedVms = useMemo(() => {
        const uptimeMap = {};
        rawVms.forEach(rv => {
            if (rv.uuid) {
                uptimeMap[rv.uuid] = rv.uptime;
            }
        });
        return vms.map(vm => {
            const lowerName = vm.vm_name?.toLowerCase().trim();
            const users = webVmsMap[lowerName] || [];
            
            // Perform UUID merging check safety verification
            let finalUptime = vm.uptime || 0;
            if (vm.vm_uuid && uptimeMap[vm.vm_uuid] !== undefined) {
                finalUptime = uptimeMap[vm.vm_uuid];
            } else if (vm.vm_name) {
                const matchedRaw = rawVms.find(rv => rv.vm_name?.toLowerCase().trim() === lowerName);
                if (matchedRaw) {
                    finalUptime = matchedRaw.uptime || 0;
                }
            }

            return {
                ...vm,
                uptime: finalUptime,
                users: users,
                ownerCount: users.length
            };
        });
    }, [vms, rawVms, webVmsMap]);

    // 6-Card KPI statistics
    const kpis = useMemo(() => {
        const total = processedVms.length;
        const running = processedVms.filter(v => v.status === "running").length;
        const stopped = processedVms.filter(v => v.status === "stopped").length;
        const gpu = processedVms.filter(v => v.vm_gpu && v.vm_gpu !== "0" && v.vm_gpu !== 0).length;
        const assigned = processedVms.filter(v => v.ownerCount > 0).length;
        const unassigned = processedVms.filter(v => v.ownerCount === 0).length;
        return { total, running, stopped, gpu, assigned, unassigned };
    }, [processedVms]);

    // Filtering Dropdown Options
    const filterOptions = useMemo(() => {
        const clusters = new Set();
        const nodes = new Set();
        const oss = new Set();
        processedVms.forEach(v => {
            if (v.cluster_name) clusters.add(v.cluster_name);
            if (v.node_name) nodes.add(v.node_name);
            if (v.os) oss.add(v.os);
        });
        return {
            clusters: Array.from(clusters),
            nodes: Array.from(nodes),
            oss: Array.from(oss)
        };
    }, [processedVms]);

    // Advanced filters dynamically populated options
    const advFilterOptions = useMemo(() => {
        const statuses = new Set();
        const clusters = new Set();
        const nodes = new Set();
        const oss = new Set();
        const gpus = new Set(["No GPU", "GPU Enabled"]);
        const entities = new Set();
        const divisions = new Set();
        const groups = new Set();

        processedVms.forEach(v => {
            if (v.status) statuses.add(v.status);
            if (v.cluster_name) clusters.add(v.cluster_name);
            if (v.node_name) nodes.add(v.node_name);
            if (v.os) oss.add(v.os);
            
            (v.users || []).forEach(u => {
                if (u.entity) entities.add(u.entity);
                if (u.division) divisions.add(u.division);
                if (u.groupname) groups.add(u.groupname);
            });
        });

        return {
            statuses: Array.from(statuses),
            clusters: Array.from(clusters),
            nodes: Array.from(nodes),
            oss: Array.from(oss),
            gpus: Array.from(gpus),
            entities: Array.from(entities),
            divisions: Array.from(divisions),
            groups: Array.from(groups)
        };
    }, [processedVms]);

    // Global Search ribbon filter & multi-filters processing
    const filteredVms = useMemo(() => {
        return processedVms.filter(vm => {
            // Global Search (VM Name, VM ID, Hostname, IP, MAC, UUID)
            if (search) {
                const sLower = search.toLowerCase().trim();
                const matches = 
                    (vm.vm_name && vm.vm_name.toLowerCase().includes(sLower)) ||
                    (vm.vm_id && vm.vm_id.toString().includes(sLower)) ||
                    (vm.vm_host_name && vm.vm_host_name.toLowerCase().includes(sLower)) ||
                    (vm.vm_ip && vm.vm_ip.toLowerCase().includes(sLower)) ||
                    (vm.vm_mac && vm.vm_mac.toLowerCase().includes(sLower)) ||
                    (vm.vm_uuid && vm.vm_uuid.toLowerCase().includes(sLower));
                if (!matches) return false;
            }

            // Quick Status
            if (quickStatus !== "all") {
                if (vm.status?.toLowerCase() !== quickStatus) return false;
            }

            // Quick Ownership
            if (quickOwnership !== "all") {
                if (quickOwnership === "assigned" && vm.ownerCount === 0) return false;
                if (quickOwnership === "unassigned" && vm.ownerCount > 0) return false;
                if (quickOwnership === "single" && vm.ownerCount !== 1) return false;
                if (quickOwnership === "multiple" && vm.ownerCount <= 1) return false;
            }

            // Quick Resource
            if (quickResource !== "all") {
                if (quickResource === "gpu" && !vm.vm_gpu) return false;
                if (quickResource === "cpu" && vm.vm_cpu < CPU_THRESHOLD) return false;
                if (quickResource === "ram" && vm.vm_max_mem < RAM_THRESHOLD) return false;
                if (quickResource === "storage" && vm.vm_max_disk < DISK_THRESHOLD) return false;
                if (quickResource === "recent") {
                    if (!vm.vm_created_date) return false;
                    const cDate = new Date(vm.vm_created_date);
                    const limit = new Date();
                    limit.setDate(limit.getDate() - 30);
                    if (cDate < limit) return false;
                }
            }

            // Quick Infrastructure dropdowns
            if (filterCluster && vm.cluster_name !== filterCluster) return false;
            if (filterNode && vm.node_name !== filterNode) return false;
            if (filterOs && vm.os !== filterOs) return false;

            // Advanced Filters
            if (advStatus && vm.status !== advStatus) return false;
            if (advCluster && vm.cluster_name !== advCluster) return false;
            if (advNode && vm.node_name !== advNode) return false;
            if (advOs && vm.os !== advOs) return false;
            if (advGpu) {
                const hasGpu = !!vm.vm_gpu;
                if (advGpu === "GPU Enabled" && !hasGpu) return false;
                if (advGpu === "No GPU" && hasGpu) return false;
            }
            if (advEntity) {
                const hasEnt = (vm.users || []).some(u => u.entity === advEntity);
                if (!hasEnt) return false;
            }
            if (advDivision) {
                const hasDiv = (vm.users || []).some(u => u.division === advDivision);
                if (!hasDiv) return false;
            }
            if (advGroup) {
                const hasGrp = (vm.users || []).some(u => u.groupname === advGroup);
                if (!hasGrp) return false;
            }

            return true;
        });
    }, [processedVms, search, quickStatus, quickOwnership, quickResource, filterCluster, filterNode, filterOs, advStatus, advCluster, advNode, advOs, advGpu, advEntity, advDivision, advGroup]);

    // Sorting views & Smart Sort Shortcuts
    const sortedVms = useMemo(() => {
        let result = [...filteredVms];

        if (smartSort) {
            if (smartSort === "ram") {
                result.sort((a, b) => b.vm_max_mem - a.vm_max_mem);
            } else if (smartSort === "cpu") {
                result.sort((a, b) => b.vm_cpu - a.vm_cpu);
            } else if (smartSort === "storage") {
                result.sort((a, b) => b.vm_max_disk - a.vm_max_disk);
            } else if (smartSort === "gpu") {
                result.sort((a, b) => (b.vm_gpu ? 1 : 0) - (a.vm_gpu ? 1 : 0));
            } else if (smartSort === "recent") {
                result.sort((a, b) => {
                    const dateA = a.vm_created_date ? new Date(a.vm_created_date) : new Date(0);
                    const dateB = b.vm_created_date ? new Date(b.vm_created_date) : new Date(0);
                    return dateB - dateA;
                });
            } else if (smartSort === "uptime") {
                result.sort((a, b) => (b.uptime || 0) - (a.uptime || 0));
            }
        } else {
            result.sort((a, b) => {
                let valA = a[sortKey] ?? "";
                let valB = b[sortKey] ?? "";
                if (typeof valA === "number" && typeof valB === "number") {
                    return sortAsc ? valA - valB : valB - valA;
                }
                return sortAsc ? valA.toString().localeCompare(valB.toString()) : valB.toString().localeCompare(valA.toString());
            });
        }

        return result;
    }, [filteredVms, smartSort, sortKey, sortAsc]);

    // KPI card toggle filter triggers
    const handleKpiClick = (label) => {
        if (label === "Total VMs") {
            setSearch("");
            setQuickStatus("all");
            setQuickOwnership("all");
            setQuickResource("all");
            setFilterOs("");
            setFilterCluster("");
            setFilterNode("");
        } else if (label === "Running VMs") {
            setQuickStatus(quickStatus === "running" ? "all" : "running");
        } else if (label === "Stopped VMs") {
            setQuickStatus(quickStatus === "stopped" ? "all" : "stopped");
        } else if (label === "GPU Enabled") {
            setQuickResource(quickResource === "gpu" ? "all" : "gpu");
        } else if (label === "Assigned VMs") {
            setQuickOwnership(quickOwnership === "assigned" ? "all" : "assigned");
        } else if (label === "Unassigned VMs") {
            setQuickOwnership(quickOwnership === "unassigned" ? "all" : "unassigned");
        }
        setCurrentPage(1);
    };

    // Active filter badges list compiler
    const activeBadges = useMemo(() => {
        const list = [];
        if (search) list.push({ key: "search", label: `Search: "${search}"`, clear: () => setSearch("") });
        if (quickStatus !== "all") list.push({ key: "status", label: `Status: ${quickStatus}`, clear: () => setQuickStatus("all") });
        if (quickOwnership !== "all") list.push({ key: "owner", label: `Owner: ${quickOwnership}`, clear: () => setQuickOwnership("all") });
        if (quickResource !== "all") list.push({ key: "resource", label: `Resource: ${quickResource}`, clear: () => setQuickResource("all") });
        if (filterCluster) list.push({ key: "cluster", label: `Cluster: ${filterCluster}`, clear: () => setFilterCluster("") });
        if (filterNode) list.push({ key: "node", label: `Node: ${filterNode}`, clear: () => setFilterNode("") });
        if (filterOs) list.push({ key: "os", label: `OS: ${filterOs}`, clear: () => setFilterOs("") });
        
        // Advanced filters
        if (advStatus) list.push({ key: "advStatus", label: `Status: ${advStatus}`, clear: () => setAdvStatus("") });
        if (advCluster) list.push({ key: "advCluster", label: `Cluster: ${advCluster}`, clear: () => setAdvCluster("") });
        if (advNode) list.push({ key: "advNode", label: `Node: ${advNode}`, clear: () => setAdvNode("") });
        if (advOs) list.push({ key: "advOs", label: `OS: ${advOs}`, clear: () => setAdvOs("") });
        if (advGpu) list.push({ key: "advGpu", label: `GPU: ${advGpu}`, clear: () => setAdvGpu("") });
        if (advEntity) list.push({ key: "advEntity", label: `Entity: ${advEntity}`, clear: () => setAdvEntity("") });
        if (advDivision) list.push({ key: "advDivision", label: `Division: ${advDivision}`, clear: () => setAdvDivision("") });
        if (advGroup) list.push({ key: "advGroup", label: `Group: ${advGroup}`, clear: () => setAdvGroup("") });
        
        return list;
    }, [search, quickStatus, quickOwnership, quickResource, filterCluster, filterNode, filterOs, advStatus, advCluster, advNode, advOs, advGpu, advEntity, advDivision, advGroup]);

    const handleResetAllFilters = () => {
        setSearch("");
        setQuickStatus("all");
        setQuickOwnership("all");
        setQuickResource("all");
        setFilterCluster("");
        setFilterNode("");
        setFilterOs("");
        setAdvStatus("");
        setAdvCluster("");
        setAdvNode("");
        setAdvOs("");
        setAdvGpu("");
        setAdvEntity("");
        setAdvDivision("");
        setAdvGroup("");
        setCurrentPage(1);
        window.history.pushState({}, document.title, window.location.pathname);
    };

    // Sunburst (Cluster -> Node -> VM) data compiler
    const sunburstData = useMemo(() => {
        const ids = ["Infrastructure"];
        const labels = ["Infrastructure"];
        const parents = [""];

        const clss = new Set();
        const nds = new Map();
        const vList = [];

        processedVms.forEach(v => {
            const c = v.cluster_name || "Standalone";
            const n = v.node_name || "Unknown Node";
            clss.add(c);
            nds.set(n, c);
            vList.push({ id: `Infrastructure/${c}/${n}/${v.vm_name}`, name: v.vm_name, parent: `Infrastructure/${c}/${n}` });
        });

        clss.forEach(c => {
            ids.push(`Infrastructure/${c}`);
            labels.push(c);
            parents.push("Infrastructure");
        });

        nds.forEach((c, n) => {
            ids.push(`Infrastructure/${c}/${n}`);
            labels.push(n);
            parents.push(`Infrastructure/${c}`);
        });

        vList.forEach(v => {
            ids.push(v.id);
            labels.push(v.name);
            parents.push(v.parent);
        });

        return { ids, labels, parents };
    }, [processedVms]);

    // Plotly click logic inside Sunburst chart
    const handleSunburstClick = (data) => {
        if (!data || !data.points || !data.points[0]) return;
        const pt = data.points[0];
        const id = pt.id;
        if (!id || id === "Infrastructure") return;

        // Check if VM leaf node
        if (id.includes("/") && id.split("/").length > 3) {
            const parts = id.split("/");
            const vmName = parts[parts.length - 1];
            const match = processedVms.find(v => (v.vm_name || "").toLowerCase() === vmName.toLowerCase());
            if (match) {
                setActiveDrawerVm(match);
                setIsDrawerOpen(true);
            }
        } else {
            // Is cluster or node
            const parts = id.split("/");
            if (parts.length === 2) {
                setFilterCluster(parts[1]);
            } else if (parts.length === 3) {
                setFilterNode(parts[2]);
            }
            setCurrentPage(1);
        }
    };

    // Plotly aggregations memoizations
    const chartsData = useMemo(() => {
        const runCount = processedVms.filter(v => v.status === "running").length;
        const stopCount = processedVms.filter(v => v.status === "stopped").length;

        const osCounts = {};
        processedVms.forEach(v => {
            const os = v.os || "Unknown";
            osCounts[os] = (osCounts[os] || 0) + 1;
        });

        const clusterCounts = {};
        processedVms.forEach(v => {
            const c = v.cluster_name || "Standalone";
            clusterCounts[c] = (clusterCounts[c] || 0) + 1;
        });

        const nodeCounts = {};
        processedVms.forEach(v => {
            const n = v.node_name || "Unknown";
            nodeCounts[n] = (nodeCounts[n] || 0) + 1;
        });

        const topNodes = Object.entries(nodeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const assignedCount = processedVms.filter(v => v.ownerCount > 0).length;
        const unassignedCount = processedVms.filter(v => v.ownerCount === 0).length;

        return {
            status: { labels: ["RUNNING", "STOPPED"], values: [runCount, stopCount] },
            os: { labels: Object.keys(osCounts), values: Object.values(osCounts) },
            cluster: { labels: Object.keys(clusterCounts), values: Object.values(clusterCounts) },
            node: { labels: topNodes.map(n => n[0]), values: topNodes.map(n => n[1]) },
            ownership: { labels: ["ASSIGNED", "UNASSIGNED"], values: [assignedCount, unassignedCount] }
        };
    }, [processedVms]);

    // Adaptive Theme color configurations matching Role accents
    const chartTheme = useMemo(() => {
        const isDark = currentTheme === "dark";
        let colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#1e3a8a", "#1d4ed8"];
        let primary = "#3b82f6";
        if (role === "manager") {
            colors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#065f46", "#047857"];
            primary = "#10b981";
        } else if (role === "user") {
            colors = ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#991b1b", "#b91c1c"];
            primary = "#ef4444";
        }

        return {
            colors,
            primary,
            layout: {
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: {
                    family: "Inter, Roboto, sans-serif",
                    color: isDark ? "#cbd5e1" : "#475569",
                    size: 10
                },
                margin: { t: 25, b: 25, l: 35, r: 15 },
                showlegend: true,
                legend: {
                    orientation: "h",
                    y: -0.15,
                    font: { size: 9, color: isDark ? "#cbd5e1" : "#475569" }
                },
                xaxis: {
                    gridcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                    linecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
                },
                yaxis: {
                    gridcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                    linecolor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
                }
            }
        };
    }, [role, currentTheme]);

    // Pagination calculations
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentVms = sortedVms.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(sortedVms.length / itemsPerPage);

    const getPageNumbers = (current, total) => {
        const pages = [];
        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
            return pages;
        }
        pages.push(1);
        if (current > 3) pages.push("...");
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (current < total - 2) pages.push("...");
        pages.push(total);
        return pages;
    };

    // Bulk selections
    const handleSelectToggle = (uuid) => {
        setSelectedVms(prev => {
            const next = new Set(prev);
            next.has(uuid) ? next.delete(uuid) : next.add(uuid);
            return next;
        });
    };

    const handleSelectAllToggle = () => {
        if (selectedVms.size === sortedVms.length) {
            setSelectedVms(new Set());
        } else {
            setSelectedVms(new Set(sortedVms.map(v => v.vm_uuid).filter(Boolean)));
        }
    };

    // Bulk Export
    const handleDownload = async () => {
        try {
            const format = selectedFormat || "csv";
            const fixedKeys = ["vm_id", "vm_name"];
            let cols = null;
            if (selectedColumns.length > 0) {
                cols = Array.from(new Set([...fixedKeys, ...selectedColumns]));
            }

            const payload = {
                columns: cols,
                format: format
            };

            // Limit query to selection if bulk is active
            if (selectedVms.size > 0) {
                payload.uuids = Array.from(selectedVms);
            } else if (role === "user") {
                payload.uuids = assignedVmUuids;
            }

            const isJson = format === "json";

            const response = await proxmoxApi.post(
                "/proxmox/report",
                payload,
                { responseType: isJson ? "json" : "blob" }
            );

            if (format === "pdf") {
                // PDF: get raw HTML, open in new window
                const rawText = response.data instanceof Blob
                    ? await response.data.text()
                    : typeof response.data === "string"
                    ? response.data
                    : JSON.stringify(response.data);
                const win = window.open("", "_blank");
                if (win) {
                    win.document.write(rawText);
                    win.document.close();
                } else {
                    const blob = new Blob([rawText], { type: "text/html" });
                    const url  = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href     = url;
                    link.download = "vm-report.html";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
            } else if (isJson) {
                const jsonStr = JSON.stringify(response.data, null, 2);
                const blob    = new Blob([jsonStr], { type: "application/json" });
                const url     = URL.createObjectURL(blob);
                const link    = document.createElement("a");
                link.href     = url;
                link.download = "vm-report.json";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                const mimeTypes = { csv: "text/csv", xls: "application/vnd.ms-excel" };
                const mimeType  = mimeTypes[format] || "application/octet-stream";
                const blob = new Blob([response.data], { type: mimeType });
                const url  = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href     = url;
                link.download = `vm-report.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            setShowPopup(false);
            showToast("success", `Report successfully exported.`);
        } catch (err) {
            console.error("Export report failed", err);
            const msg = err.response?.data?.error || err.message || "Failed to generate report export.";
            showToast("error", msg);
        }
    };

    // Loading overlay
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
                <Loader text="Initializing VM Operations Center..." />
            </div>
        );
    }

    // Dataset Validation Block
    if (validationError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
                <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950 rounded-2xl p-8 max-w-lg shadow-xl text-center">
                    <ShieldAlert className="mx-auto text-red-500 mb-4 animate-bounce" size={48} />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Operations Center Terminated</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{validationError}</p>
                    <button 
                        onClick={fetchVmsData} 
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition"
                    >
                        Sync and Verify Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-0 pt-0 pb-10">
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 items-end">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`flex items-center gap-3 min-w-[320px] px-5 py-3 rounded-lg shadow-lg text-white ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                        <span className="text-xl leading-none">{toast.type === "success" ? "✔" : "✖"}</span>
                        <span className="font-medium text-sm break-words">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* Sticky Bulk Selection Bar */}
            {selectedVms.size > 0 && (
                <div className="sticky top-0 z-40 bg-role-primary text-white py-3 px-8 flex justify-between items-center shadow-lg transition duration-200 animate-slide-in">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-sm">{selectedVms.size} VM(s) Selected</span>
                        <div className="text-xs opacity-90 border-l border-white/20 pl-4 font-mono hidden md:block">
                            CPUs: {sortedVms.filter(v => selectedVms.has(v.vm_uuid)).reduce((acc, curr) => acc + (curr.vm_cpu || 0), 0)} Cores | 
                            RAM: {sortedVms.filter(v => selectedVms.has(v.vm_uuid)).reduce((acc, curr) => acc + (curr.vm_max_mem || 0), 0)} GB
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowPopup(true)} 
                            className="bg-white text-role-primary hover:bg-white/95 px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                            <Download size={14} /> Export Report
                        </button>
                        <button 
                            onClick={() => setSelectedVms(new Set())} 
                            className="bg-transparent hover:bg-white/10 text-white border border-white/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Title */}
            <h1 className="text-center text-slate-800 dark:text-slate-100 font-extrabold text-3xl mt-5 mb-5 tracking-tight">
                {role === "user" ? "My Virtual Machines Center" : "VM Operations Dashboard"}
            </h1>

            {/* KPI Header Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 px-8 mb-6">
                {[
                    { label: "Total VMs", value: kpis.total, icon: Monitor, border: "border-l-role-primary" },
                    { label: "Running VMs", value: kpis.running, icon: Play, border: "border-l-emerald-500" },
                    { label: "Stopped VMs", value: kpis.stopped, icon: Square, border: "border-l-slate-400" },
                    { label: "GPU Enabled", value: kpis.gpu, icon: Activity, border: "border-l-purple-500" },
                    { label: "Assigned VMs", value: kpis.assigned, icon: Users, border: "border-l-blue-500" },
                    { 
                        label: "Unassigned VMs", 
                        value: kpis.unassigned, 
                        icon: ShieldAlert, 
                        border: "border-l-rose-500",
                        isAlert: true 
                    }
                ].map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div 
                            key={idx} 
                            onClick={() => handleKpiClick(kpi.label)}
                            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group ${kpi.border} ${
                                kpi.isAlert && kpis.unassigned > 0 ? "kpi-unassigned-pulse bg-rose-50/10 dark:bg-rose-950/10 border-rose-500" : ""
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                                kpi.isAlert && kpis.unassigned > 0 
                                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" 
                                : "bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400"
                            }`}>
                                <Icon size={20} className={kpi.isAlert && kpis.unassigned > 0 ? "animate-bounce" : ""} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{kpi.label}</div>
                                <div className="text-2xl font-black text-slate-800 dark:text-slate-50 mt-0.5">{kpi.value}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters Scope Banner */}
            {activeBadges.length > 0 && (
                <div className="mx-8 mb-5 bg-blue-50/30 dark:bg-slate-900/50 border border-blue-100/60 dark:border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-slide-in">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Filters:</span>
                        {activeBadges.map((badge, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200/30 dark:border-blue-900/30 font-mono"
                            >
                                <span className="font-bold">{badge.label}</span>
                                <button
                                    onClick={badge.clear}
                                    className="hover:text-red-500 transition-colors focus:outline-none"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                            {sortedVms.length} / {processedVms.length} VMs matching
                        </span>
                        <button
                            onClick={handleResetAllFilters}
                            className="px-4 py-1.5 bg-red-100 hover:bg-red-200/80 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200/50 dark:border-red-900/40 transition"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Collapsible Analytics Strip Toggle */}
            <div className="px-8 mb-5">
                <button 
                    onClick={() => setShowAnalytics(!showAnalytics)} 
                    className="w-full flex items-center justify-between px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
                >
                    <div className="flex items-center gap-2">
                        <BarChart2 size={16} />
                        <span>Interactive Operations Analytics</span>
                    </div>
                    {showAnalytics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAnalytics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-4 bg-slate-50 dark:bg-slate-900/10 p-4 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-inner">
                        {/* Status Donut */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[220px]">
                            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">VM Status Ratio</h3>
                            <div className="flex-1 min-h-[160px] flex items-center justify-center">
                                <Plot 
                                    data={[{
                                        type: "pie",
                                        hole: 0.55,
                                        labels: chartsData.status.labels,
                                        values: chartsData.status.values,
                                        textinfo: "value",
                                        marker: { colors: [chartTheme.primary, "#cbd5e1"] },
                                        hoverinfo: "label+percent"
                                    }]}
                                    onClick={(data) => {
                                        if (data?.points?.[0]) {
                                            const label = String(data.points[0].label).toLowerCase();
                                            setQuickStatus(quickStatus === label ? "all" : label);
                                            setCurrentPage(1);
                                        }
                                    }}
                                    layout={{ ...chartTheme.layout, showlegend: false }}
                                    useResizeHandler
                                    style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>
                        </div>

                        {/* OS Distribution */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[220px]">
                            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">OS Distribution</h3>
                            <div className="flex-1 min-h-[160px] flex items-center justify-center">
                                <Plot 
                                    data={[{
                                        type: "bar",
                                        orientation: "h",
                                        y: chartsData.os.labels,
                                        x: chartsData.os.values,
                                        marker: { color: chartTheme.colors }
                                    }]}
                                    onClick={(data) => {
                                        if (data?.points?.[0]?.y) {
                                            const os = data.points[0].y;
                                            setFilterOs(filterOs === os ? "" : os);
                                            setCurrentPage(1);
                                        }
                                    }}
                                    layout={{ ...chartTheme.layout, showlegend: false }}
                                    useResizeHandler
                                    style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>
                        </div>

                        {/* Cluster Workloads */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[220px]">
                            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Cluster Workloads</h3>
                            <div className="flex-1 min-h-[160px] flex items-center justify-center">
                                <Plot 
                                    data={[{
                                        type: "bar",
                                        x: chartsData.cluster.labels,
                                        y: chartsData.cluster.values,
                                        marker: { color: chartTheme.primary }
                                    }]}
                                    onClick={(data) => {
                                        if (data?.points?.[0]?.x) {
                                            const cluster = data.points[0].x;
                                            setFilterCluster(filterCluster === cluster ? "" : cluster);
                                            setCurrentPage(1);
                                        }
                                    }}
                                    layout={{ ...chartTheme.layout, showlegend: false }}
                                    useResizeHandler
                                    style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>
                        </div>

                        {/* Ownership Ratio */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[220px]">
                            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Ownership Ratio</h3>
                            <div className="flex-1 min-h-[160px] flex items-center justify-center">
                                <Plot 
                                    data={[{
                                        type: "pie",
                                        labels: chartsData.ownership.labels,
                                        values: chartsData.ownership.values,
                                        marker: { colors: [chartTheme.primary, "#fca5a5"] },
                                        hoverinfo: "label+percent"
                                    }]}
                                    onClick={(data) => {
                                        if (data?.points?.[0]?.label) {
                                            const label = String(data.points[0].label).toLowerCase();
                                            setQuickOwnership(quickOwnership === label ? "all" : label);
                                            setCurrentPage(1);
                                        }
                                    }}
                                    layout={{ ...chartTheme.layout, showlegend: false }}
                                    useResizeHandler
                                    style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>
                        </div>

                        {/* Nodes allocation (Top Nodes concentration) */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[220px]">
                            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Concentration per Node</h3>
                            <div className="flex-1 min-h-[160px] flex items-center justify-center">
                                <Plot 
                                    data={[{
                                        type: "bar",
                                        orientation: "h",
                                        y: chartsData.node.labels,
                                        x: chartsData.node.values,
                                        marker: { color: chartTheme.colors }
                                    }]}
                                    onClick={(data) => {
                                        if (data?.points?.[0]?.y) {
                                            const node = data.points[0].y;
                                            setFilterNode(filterNode === node ? "" : node);
                                            setCurrentPage(1);
                                        }
                                    }}
                                    layout={{ ...chartTheme.layout, showlegend: false }}
                                    useResizeHandler
                                    style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>
                        </div>

                        {/* Sunburst workloads Hierarchy */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[220px]">
                            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Sunburst Hierarchy</h3>
                            <div className="flex-1 min-h-[160px] flex items-center justify-center">
                                <Plot 
                                    data={[{
                                        type: "sunburst",
                                        ids: sunburstData.ids,
                                        labels: sunburstData.labels,
                                        parents: sunburstData.parents,
                                        branchvalues: "total",
                                        hoverinfo: "label+value",
                                        marker: { line: { width: 0.5 }, colors: chartTheme.colors }
                                    }]}
                                    onClick={handleSunburstClick}
                                    layout={{ ...chartTheme.layout, showlegend: false }}
                                    useResizeHandler
                                    style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Filters & Searches Container */}
            <div className="px-8 mb-4 flex flex-col gap-3">
                {/* Advanced Search & Dropdowns */}
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Real-time Global Search bar */}
                    <div className="flex-1 flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:border-role-primary focus-within:shadow-md px-3 py-1.5 transition">
                        <Search className="text-slate-400 mr-2.5" size={18} />
                        <input 
                            type="text" 
                            placeholder="Global search (Name, VM ID, Hostname, IP, MAC, UUID)..." 
                            className="flex-1 border-none bg-transparent py-2 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder-slate-400"
                            value={search} 
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} 
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 text-xs">Clear</button>
                        )}
                    </div>

                    {/* Infrastructure selectors */}
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                        <select 
                            value={filterCluster} 
                            onChange={(e) => { setFilterCluster(e.target.value); setCurrentPage(1); }} 
                            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none transition"
                        >
                            <option value="">All Clusters</option>
                            {filterOptions.clusters.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                            value={filterNode} 
                            onChange={(e) => { setFilterNode(e.target.value); setCurrentPage(1); }} 
                            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none transition"
                        >
                            <option value="">All Nodes</option>
                            {filterOptions.nodes.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <select 
                            value={filterOs} 
                            onChange={(e) => { setFilterOs(e.target.value); setCurrentPage(1); }} 
                            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none transition"
                        >
                            <option value="">All OS Types</option>
                            {filterOptions.oss.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>

                    {/* Advanced filter toggler */}
                    <button 
                        onClick={() => setShowAdvFilters(!showAdvFilters)}
                        className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            showAdvFilters 
                            ? "bg-role-primary border-role-primary text-white" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                    >
                        <SlidersHorizontal size={14} />
                        Filters
                    </button>
                </div>

                {/* Advanced Dropdown selectors panel */}
                {showAdvFilters && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 bg-white dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-xl animate-slide-in shadow-inner">
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">STATUS</label>
                            <select value={advStatus} onChange={(e) => setAdvStatus(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">CLUSTER</label>
                            <select value={advCluster} onChange={(e) => setAdvCluster(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.clusters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">NODE</label>
                            <select value={advNode} onChange={(e) => setAdvNode(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.nodes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">OS</label>
                            <select value={advOs} onChange={(e) => setAdvOs(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.oss.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">GPU</label>
                            <select value={advGpu} onChange={(e) => setAdvGpu(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.gpus.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">ENTITY</label>
                            <select value={advEntity} onChange={(e) => setAdvEntity(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.entities.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">DIVISION</label>
                            <select value={advDivision} onChange={(e) => setAdvDivision(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.divisions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">GROUP</label>
                            <select value={advGroup} onChange={(e) => setAdvGroup(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[11px]">
                                <option value="">All</option>
                                {advFilterOptions.groups.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Quick Filters Ribbon row */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2.5 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            <span className="font-semibold text-slate-400 uppercase text-[9px] mr-1">Status:</span>
                            {["all", "running", "stopped"].map(st => (
                                <button
                                    key={st}
                                    onClick={() => { setQuickStatus(st); setCurrentPage(1); }}
                                    className={`px-2.5 py-1 rounded-md font-bold transition capitalize ${
                                        quickStatus === st 
                                        ? "bg-role-primary text-white shadow-sm" 
                                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350"
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            <span className="font-semibold text-slate-400 uppercase text-[9px] mr-1">Owner:</span>
                            {[
                                { id: "all", label: "All" },
                                { id: "assigned", label: "Assigned" },
                                { id: "unassigned", label: "Unassigned Only" }
                            ].map(o => (
                                <button
                                    key={o.id}
                                    onClick={() => { setQuickOwnership(o.id); setCurrentPage(1); }}
                                    className={`px-2.5 py-1 rounded-md font-bold transition ${
                                        quickOwnership === o.id 
                                        ? "bg-role-primary text-white shadow-sm" 
                                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350"
                                    }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            <span className="font-semibold text-slate-400 uppercase text-[9px] mr-1">Compute Limits:</span>
                            {[
                                { id: "all", label: "All Specs" },
                                { id: "gpu", label: "GPU Core" },
                                { id: "cpu", label: `High CPU (>= ${CPU_THRESHOLD})` },
                                { id: "ram", label: `High RAM (>= ${RAM_THRESHOLD}G)` },
                                { id: "storage", label: `Disk (>= ${DISK_THRESHOLD}G)` }
                            ].map(res => (
                                <button
                                    key={res.id}
                                    onClick={() => { setQuickResource(res.id); setCurrentPage(1); }}
                                    className={`px-2.5 py-1 rounded-md font-bold transition ${
                                        quickResource === res.id 
                                        ? "bg-role-primary text-white shadow-sm" 
                                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350"
                                    }`}
                                >
                                    {res.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Smart Views Sort Shortcuts */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-400 text-[10px] uppercase flex items-center gap-1">
                            <ArrowUpDown size={12} /> Smart Views:
                        </span>
                        <select 
                            value={smartSort} 
                            onChange={(e) => { setSmartSort(e.target.value); setCurrentPage(1); }} 
                            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                        >
                            <option value="">Table Header Default</option>
                            <option value="cpu">Highest CPU Consumers</option>
                            <option value="ram">Largest RAM Consumers</option>
                            <option value="storage">Largest Storage Consumers</option>
                            <option value="gpu">GPU Consumers</option>
                            <option value="recent">Recently Created</option>
                            <option value="uptime">Longest Running Uptime</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Custom Report Downloads Button */}
            <div className="flex justify-between items-center px-8 mb-4">
                <div className="text-xs text-slate-500 font-semibold">
                    Found {sortedVms.length} VM configurations in operations map
                </div>
                <button 
                    onClick={() => setShowPopup(true)} 
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition"
                >
                    <Download size={14} /> Export Custom Report
                </button>
            </div>

            {/* Main VM Table Container */}
            <div className="overflow-hidden rounded-2xl mx-8 border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[12px] table-auto bg-white dark:bg-slate-900/40">
                        <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 select-none">
                            <tr>
                                {/* Bulk Selection Checkbox */}
                                <th className="px-3 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300 w-12">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedVms.size === sortedVms.length && sortedVms.length > 0} 
                                        onChange={handleSelectAllToggle}
                                        className="w-4 h-4 rounded text-role-primary focus:ring-role-primary border-slate-300 dark:border-slate-700 cursor-pointer"
                                    />
                                </th>
                                {/* Expand Fallback arrow Column */}
                                <th className="px-3 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300 w-12">Details</th>
                                
                                {[
                                    { key: "serial", label: "Sl. No." },
                                    { key: "status", label: "Status" },
                                    { key: "vm_name", label: "VM Name" },
                                    { key: "vm_id", label: "VM ID" },
                                    { key: "cluster_name", label: "Cluster" },
                                    { key: "node_name", label: "Node" },
                                    { key: "vm_cpu", label: "CPUs" },
                                    { key: "vm_max_mem", label: "Memory" },
                                    { key: "vm_max_disk", label: "Storage" },
                                    { key: "vm_ip", label: "IP Address" },
                                    { key: "os", label: "OS" },
                                    { key: "vm_gpu", label: "GPU" },
                                    { key: "ownerCount", label: "Owner Count" }
                                ].map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => {
                                            if (col.key === "serial") return;
                                            setSmartSort(""); // Override smart sort
                                            if (sortKey === col.key) setSortAsc(!sortAsc);
                                            else { setSortKey(col.key); setSortAsc(true); }
                                        }}
                                        className={`px-3 py-3.5 text-left font-bold text-slate-700 dark:text-slate-350 whitespace-nowrap overflow-hidden text-ellipsis ${
                                            col.key !== "serial" ? "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800" : ""
                                        }`}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>{col.label}</span>
                                            {sortKey === col.key && !smartSort && (sortAsc ? "▲" : "▼")}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-3 py-3.5 text-left font-bold text-slate-700 dark:text-slate-300">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentVms.length === 0 ? (
                                <tr>
                                    <td colSpan="16" className="text-center text-slate-500 py-16 bg-white dark:bg-slate-900">
                                        <ShieldAlert className="mx-auto text-slate-200 mb-2" size={40} />
                                        <p className="font-semibold text-sm">No VM configurations match your filter criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                currentVms.map((vm, index) => (
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
                                        canManageUsers={canManageUsers}
                                        isSelected={selectedVms.has(vm.vm_uuid)}
                                        onSelectToggle={handleSelectToggle}
                                        onRowClick={(v) => {
                                            setActiveDrawerVm(v);
                                            setIsDrawerOpen(true);
                                        }}
                                        ownerCount={vm.ownerCount}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Ribbon */}
            {sortedVms.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4 px-8">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        <span>Rows per page:</span>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition"
                        >
                            {[5, 10, 20, 50, 100].map((num) => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                        Showing {indexOfFirst + 1} to {Math.min(indexOfLast, sortedVms.length)} of {sortedVms.length} VMs
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage((p) => p - 1)} 
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            Prev
                        </button>
                        {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                            p === "..." ? (
                                <span key={idx} className="px-2 text-gray-400">...</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                        currentPage === p ? "border-role-primary text-role-primary ring-1 ring-role-primary-light" : "border-slate-200 dark:border-slate-800"
                                    }`}
                                >
                                    {p}
                                </button>
                            )
                        )}
                        <button 
                            disabled={currentPage === totalPages || totalPages === 0} 
                            onClick={() => setCurrentPage((p) => p + 1)} 
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Sliding Details Drawer */}
            <VmDrawer 
                vm={activeDrawerVm}
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); setActiveDrawerVm(null); }}
                role={role}
                staffCode={staffCode}
                onAddUser={() => {
                    if (!canManageUsers) return;
                    setSelectedVm(activeDrawerVm);
                    setShowAddUserModal(true);
                }}
                onRemoveUser={() => {
                    if (!canManageUsers) return;
                    setRemoveVm(activeDrawerVm);
                    setShowRemoveUserModal(true);
                }}
                cache={drawerCache}
                onUpdateCache={updateDrawerCache}
            />

            {/* Reports Config Popup */}
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

            {/* Modals */}
            {showAddUserModal && (
                <AddUserModal 
                    vm={selectedVm} 
                    onClose={() => setShowAddUserModal(false)}
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
                                
                                // Invalidate the drawer details cache for this modified VM
                                setDrawerCache(prev => {
                                    const next = { ...prev };
                                    delete next[selectedVm.vm_uuid];
                                    return next;
                                });
                                
                                fetchVmsData();
                            })
                            .catch(() => {
                                showToast("error", "Failed to add users! Check system logs");
                            });
                    }}
                />
            )}

            {showRemoveUserModal && (
                <RemoveUserModal 
                    vm={removeVm} 
                    onClose={() => { setShowRemoveUserModal(false); setRemoveVm(null); }}
                    onRemoved={() => {
                        notifyRemovePostMade();
                        showToast("success", "Users removed successfully");
                        
                        // Invalidate the drawer details cache for this modified VM
                        setDrawerCache(prev => {
                            const next = { ...prev };
                            delete next[removeVm.vm_uuid];
                            return next;
                        });
                        
                        fetchVmsData();
                    }}
                />
            )}
        </div>
    );
};

export default VmDashboard;