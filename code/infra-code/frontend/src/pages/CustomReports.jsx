import React, { useEffect, useMemo, useState, useCallback } from "react";
import Plot from "react-plotly.js";
import webApi from "../api/webapi";
import proxmoxApi from "../api/proxmoxapi";
import Loader from "../components/Loader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import PageContainer from "../layouts/PageContainer";
import ReportPopup from "../components/ReportPopup";
import { useTheme } from "../theme/ThemeProvider";
import {
  Monitor, Filter, Download, RefreshCw,
  BarChart2, PieChart, Layers, Server,
  Shield, Activity, Cpu, HardDrive, Star, Trash2, Play, Plus, Edit, Copy, Check,
  ChevronDown, ChevronUp, X, FileText, ChevronLeft, ChevronRight
} from "lucide-react";

// ─── Plotly theme (role-sensitive) ───────────────────────────────────────────
const getPlotlyTheme = (role, theme) => {
  const isDark = theme === "dark";
  let primaryColor = "#3b82f6";
  let colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#2563eb"];
  if (role === "manager") {
    primaryColor = "#10b981";
    colors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#059669"];
  }
  return {
    primaryColor, colors,
    layout: {
      paper_bgcolor: "transparent", plot_bgcolor: "transparent",
      font: { family: "Inter, Roboto, sans-serif", color: isDark ? "#cbd5e1" : "#475569", size: 11 },
      margin: { t: 30, b: 40, l: 40, r: 15 },
      showlegend: true,
      legend: { orientation: "h", y: -0.25, font: { size: 10, color: isDark ? "#cbd5e1" : "#475569" } },
      xaxis: { gridcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", tickfont: { color: isDark ? "#94a3b8" : "#64748b" } },
      yaxis: { gridcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", tickfont: { color: isDark ? "#94a3b8" : "#64748b" } }
    }
  };
};

// ─── All report columns ───────────────────────────────────────────────────────
const ALL_REPORT_FIELDS = [
  { key: "vm_name",              label: "VM Name" },
  { key: "vm_uuid",              label: "UUID" },
  { key: "os",                   label: "OS" },
  { key: "status",               label: "Status" },
  { key: "live_status",          label: "Live Status" },
  { key: "uptime",               label: "Uptime" },
  { key: "cpus",                 label: "CPUs" },
  { key: "max_memory",           label: "RAM (GB)" },
  { key: "max_disk",             label: "Disk (GB)" },
  { key: "cluster_name",         label: "Cluster" },
  { key: "node_name",            label: "Node" },
  { key: "ip",                   label: "IP Address" },
  { key: "mac",                  label: "MAC Address" },
  { key: "gpu",                  label: "GPU" },
  { key: "gpu_info",             label: "GPU Details" },
  { key: "created_date",         label: "Created Date" },
  { key: "users_assigned",       label: "Users Assigned" },
  { key: "com_focal_point",      label: "COM Focal Point" },
  { key: "end_user_focal_point", label: "End User Focal Point" },
  { key: "prometheus_status",    label: "Prometheus Status" },
  { key: "software_installed",   label: "Software Installed" },
  { key: "request_source",       label: "Request Source" },
  { key: "storages",             label: "Storage Pools" },
];

const FALLBACK_PRESETS = [
  {
    id: "inventory",
    title: "VM Inventory Report",
    description: "Complete VM inventory across all clusters and nodes.",
    columns: ["vm_name", "os", "status", "cluster_name", "node_name", "cpus", "max_memory", "max_disk", "ip", "gpu"],
  },
  {
    id: "ownership",
    title: "Ownership Report",
    description: "User-to-VM ownership mappings and focal point assignments.",
    columns: ["vm_name", "users_assigned", "com_focal_point", "end_user_focal_point", "os", "status", "cluster_name"],
  },
  {
    id: "capacity",
    title: "Capacity Report",
    description: "CPU, RAM and storage allocations across infrastructure.",
    columns: ["vm_name", "cpus", "max_memory", "max_disk", "gpu", "gpu_info", "node_name", "cluster_name", "status"],
  },
];

const FILTER_PRESETS = [
  { id: "infrastructure", label: "Infrastructure", description: "All running VMs across every cluster", filters: { status: "running" } },
  { id: "capacity", label: "Capacity", description: "GPU-enabled high-resource VMs", filters: { gpu: "yes" } },
  { id: "ownership", label: "Ownership", description: "VMs with at least one assigned user", filters: { assigned: "yes" } },
  { id: "compliance", label: "Compliance", description: "Unassigned VMs — ownership gaps", filters: { assigned: "no" } },
  { id: "security", label: "Security Audit", description: "Stopped VMs and unmonitored nodes", filters: { status: "stopped" } },
];

function KpiCard({ label, value, unit, icon, accentClass }) {
  return (
    <Card className={`p-4 border-l-4 ${accentClass} flex items-center gap-3`}>
      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
          {value} {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
        </div>
      </div>
    </Card>
  );
}

function FilterTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors"><X size={11} /></button>
    </span>
  );
}

// ─── Main Component ────────────────-------------------------------------------
export default function CustomReports() {
  const { currentTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const role = user.role || "admin";
  const staffCode = user.staff_code || "";
  const tc = getPlotlyTheme(role, currentTheme);
  const accentBorder = role === "manager" ? "border-l-emerald-500" : "border-l-blue-500";
  const accentText   = role === "manager" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400";
  const accentBg     = role === "manager" ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-blue-50 dark:bg-blue-950/20";
  
  // ── Raw Data ───────────────────────────────────────────────────────────────
  const [proxmoxVms, setProxmoxVms] = useState([]);
  const [webVms,     setWebVms]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  // ── Filters (client-side) ──────────────────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterOS,       setFilterOS]       = useState("all");
  const [filterCluster,  setFilterCluster]  = useState("all");
  const [filterNode,     setFilterNode]     = useState("all");
  const [filterGpu,      setFilterGpu]      = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");

  // ── Saved reports & dynamic templates states ───────────────────────────────
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [templates, setTemplates] = useState(FALLBACK_PRESETS);
  const [savedPage, setSavedPage] = useState(1);
  const [savedTotal, setSavedTotal] = useState(0);

  // active config metadata
  const [activePresetName, setActivePresetName] = useState("Custom Report");
  const [activePresetType, setActivePresetType] = useState("custom");
  const [activeSavedReportId, setActiveSavedReportId] = useState(null);

  // Save report modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  // Dynamic template manager modal (Admin only)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateColumns, setTemplateColumns] = useState([]);
  const [templateEnabled, setTemplateEnabled] = useState(true);

  // ── Report popup ───────────────────────────────────────────────────────────
  const [showPopup,        setShowPopup]        = useState(false);
  const [selectedColumns,  setSelectedColumns]  = useState([]);
  const [selectedFormat,   setSelectedFormat]   = useState("csv");
  const [exporting,        setExporting]        = useState(false);

  // ── Fetch dynamic templates & saved configs ───────────────────────────────
  const fetchSavedConfigs = async (p = 1) => {
    try {
      const res = await proxmoxApi.get("/proxmox/reports/saved", { params: { page: p, limit: 5 } });
      if (res.data) {
        setSavedConfigs(res.data.data || []);
        setSavedTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch saved report configs:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await proxmoxApi.get("/proxmox/report/templates");
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          columns: t.default_columns,
          filters: t.default_filters,
          enabled: t.enabled
        }));
        setTemplates(mapped);
      } else {
        setTemplates([]); // Empty state (Rule 18)
      }
    } catch (err) {
      // Soft failure (Rule 18)
      console.error("Failed to fetch dynamic templates, using static fallback:", err);
      setTemplates(FALLBACK_PRESETS);
    }
  };

  useEffect(() => {
    fetchSavedConfigs(savedPage);
  }, [savedPage]);

  // ── Fetch VM Details on Mount ──────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pRes, wRes] = await Promise.all([
          proxmoxApi.get("/proxmox/vms/vmData"),
          webApi.get("/vms"),
        ]);
        setProxmoxVms(pRes.data || []);
        setWebVms(wRes.data || []);
        setError("");
        
        await fetchTemplates();
        await fetchSavedConfigs(1);
      } catch (err) {
        console.error("CustomReports fetch error:", err);
        setError("Unable to load infrastructure data. Please check backends and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Build ownership map (vm_uuid → users[]) ────────────────────────────────
  const ownershipMap = useMemo(() => {
    const map = {};
    webVms.forEach((vm) => {
      if (vm.vm_uuid) map[vm.vm_uuid] = vm.users || [];
    });
    return map;
  }, [webVms]);

  // ── Merge proxmox + web data ───────────────────────────────────────────────
  const mergedVms = useMemo(() => {
    return proxmoxVms.map((vm) => ({
      ...vm,
      users: ownershipMap[vm.vm_uuid] || [],
      isAssigned: (ownershipMap[vm.vm_uuid] || []).length > 0,
    }));
  }, [proxmoxVms, ownershipMap]);

  // ── Derive unique filter values ────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    const statuses  = [...new Set(mergedVms.map((v) => v.status).filter(Boolean))];
    const osList    = [...new Set(mergedVms.map((v) => v.os).filter(Boolean))];
    const clusters  = [...new Set(mergedVms.map((v) => v.cluster_name).filter(Boolean))];
    const nodes     = [...new Set(mergedVms.map((v) => v.node_name).filter(Boolean))];
    return { statuses, osList, clusters, nodes };
  }, [mergedVms]);

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filteredVms = useMemo(() => {
    return mergedVms.filter((vm) => {
      if (filterStatus   !== "all" && vm.status?.toLowerCase()      !== filterStatus)   return false;
      if (filterOS       !== "all" && (vm.os || "")                 !== filterOS)       return false;
      if (filterCluster  !== "all" && (vm.cluster_name || "")       !== filterCluster)  return false;
      if (filterNode     !== "all" && (vm.node_name || "")          !== filterNode)      return false;
      if (filterGpu      === "yes" && !vm.gpu)                                          return false;
      if (filterGpu      === "no"  && vm.gpu)                                           return false;
      if (filterAssigned === "yes" && !vm.isAssigned)                                   return false;
      if (filterAssigned === "no"  && vm.isAssigned)                                    return false;
      if (filterDateFrom) {
        const created = vm.created_date ? new Date(vm.created_date) : null;
        if (!created || created < new Date(filterDateFrom))                              return false;
      }
      if (filterDateTo) {
        const created = vm.created_date ? new Date(vm.created_date) : null;
        if (!created || created > new Date(filterDateTo))                                return false;
      }
      return true;
    });
  }, [mergedVms, filterStatus, filterOS, filterCluster, filterNode, filterGpu, filterAssigned, filterDateFrom, filterDateTo]);

  const filteredUuids = useMemo(() => filteredVms.map((v) => v.vm_uuid).filter(Boolean), [filteredVms]);

  // ── KPI summary for filtered set ──────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:    filteredVms.length,
    running:  filteredVms.filter((v) => (v.status || "").toLowerCase() === "running").length,
    assigned: filteredVms.filter((v) => v.isAssigned).length,
    gpu:      filteredVms.filter((v) => v.gpu).length,
  }), [filteredVms]);

  // ── Chart data ────────────────---------------------------------------------
  const chartData = useMemo(() => {
    const statusMap  = {};
    const osMap      = {};
    const clusterMap = {};
    const assignMap  = { "Assigned": 0, "Unassigned": 0 };
    filteredVms.forEach((vm) => {
      const st  = (vm.status || "stopped").toLowerCase();
      const os  = vm.os || "Unknown";
      const cls = vm.cluster_name || "Unknown";
      statusMap[st]  = (statusMap[st]  || 0) + 1;
      osMap[os]       = (osMap[os]       || 0) + 1;
      clusterMap[cls] = (clusterMap[cls] || 0) + 1;
      if (vm.isAssigned) assignMap["Assigned"]++; else assignMap["Unassigned"]++;
    });
    return { statusMap, osMap, clusterMap, assignMap };
  }, [filteredVms]);

  // ── Apply dynamic template or saved config filters ────────────────────────
  const loadFilters = (flts) => {
    if (!flts) return;
    if (flts.status) setFilterStatus(flts.status);
    if (flts.os) setFilterOS(flts.os);
    if (flts.cluster) setFilterCluster(flts.cluster);
    if (flts.node) setFilterNode(flts.node);
    if (flts.gpu) setFilterGpu(flts.gpu);
    if (flts.assigned) setFilterAssigned(flts.assigned);
    if (flts.dateFrom) setFilterDateFrom(flts.dateFrom);
    if (flts.dateTo) setFilterDateTo(flts.dateTo);
  };

  const clearFilters = () => {
    setFilterStatus("all"); setFilterOS("all"); setFilterCluster("all");
    setFilterNode("all");   setFilterGpu("all"); setFilterAssigned("all");
    setFilterDateFrom(""); setFilterDateTo("");
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const applyFilterPreset = (preset) => {
    clearFilters();
    if (preset.filters.status)   setFilterStatus(preset.filters.status);
    if (preset.filters.gpu)      setFilterGpu(preset.filters.gpu);
    if (preset.filters.assigned) setFilterAssigned(preset.filters.assigned);
  };

  const activeFilterCount = [filterStatus, filterOS, filterCluster, filterNode, filterGpu, filterAssigned]
    .filter((f) => f !== "all").length + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0);

  const openPreset = (preset) => {
    setSelectedColumns(preset.columns);
    setSelectedFormat("csv");
    setActivePresetName(preset.title);
    setActivePresetType(preset.id ? String(preset.id) : preset.title);
    setActiveSavedReportId(null);
    if (preset.filters) loadFilters(preset.filters);
    setShowPopup(true);
  };

  const openSavedReport = (report) => {
    setSelectedColumns(report.columns);
    setSelectedFormat("csv");
    setActivePresetName(report.title);
    setActivePresetType("saved");
    setActiveSavedReportId(report.id);
    if (report.filters) loadFilters(report.filters);
    setShowPopup(true);
  };

  // ── Save Configurations CRUD ───────────────────────────────────────────────
  const handleOpenSaveModal = () => {
    if (selectedColumns.length === 0) {
      alert("Configure a report first by selecting columns.");
      return;
    }
    setShowSaveModal(true);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!saveTitle.trim()) {
      alert("Report title is required");
      return;
    }
    try {
      const activeFilters = {
        status: filterStatus,
        os: filterOS,
        cluster: filterCluster,
        node: filterNode,
        gpu: filterGpu,
        assigned: filterAssigned,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo
      };
      
      const payload = {
        title: saveTitle.trim(),
        description: saveDescription.trim(),
        columns: selectedColumns,
        filters: activeFilters
      };
      
      await proxmoxApi.post("/proxmox/reports/saved", payload);
      alert("Report configuration saved successfully!");
      setShowSaveModal(false);
      setSaveTitle("");
      setSaveDescription("");
      fetchSavedConfigs(1);
    } catch (err) {
      console.error("Save failed:", err);
      const msg = err.response?.data?.error || "Failed to save configuration.";
      alert(msg);
    }
  };

  const handleDeleteConfig = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this saved configuration permanently?")) return;
    try {
      await proxmoxApi.delete(`/proxmox/reports/saved/${id}`);
      fetchSavedConfigs(1);
    } catch (err) {
      console.error("Delete config failed:", err);
      alert("Failed to delete configuration.");
    }
  };

  const handleToggleFavorite = async (id, e) => {
    e.stopPropagation();
    try {
      await proxmoxApi.post("/proxmox/reports/favorite", { report_id: id });
      fetchSavedConfigs(savedPage);
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  };

  // ── Export handler (Preserves Rule 11 & isolates Rule 13) ─────────────────
  const handleDownload = async () => {
    if (!selectedFormat)           { alert("Please select a format.");          return; }
    if (!selectedColumns.length)   { alert("Please select at least one column."); return; }
    if (!filteredUuids.length)     { alert("No VMs match the current filters."); return; }
    try {
      setExporting(true);
      
      const activeFilters = {
        status: filterStatus,
        os: filterOS,
        cluster: filterCluster,
        node: filterNode,
        gpu: filterGpu,
        assigned: filterAssigned,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo
      };

      const isJson = selectedFormat === "json";

      const res = await proxmoxApi.post(
        "/proxmox/report",
        {
          columns: selectedColumns,
          format: selectedFormat,
          uuids: filteredUuids,
          staff_code: staffCode,
          report_name: activePresetName,
          report_type: activePresetType,
          saved_report_id: activeSavedReportId,
          filters: activeFilters
        },
        { responseType: isJson ? "json" : "blob" }
      );

      if (selectedFormat === "pdf") {
        // PDF: receive as blob, convert to text/html, open in new window
        const rawText = res.data instanceof Blob
          ? await res.data.text()
          : typeof res.data === "string"
          ? res.data
          : JSON.stringify(res.data);
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(rawText);
          win.document.close();
        } else {
          // Fallback: download as .html if popup blocked
          const blob = new Blob([rawText], { type: "text/html" });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a");
          a.href     = url;
          a.download = `${activePresetName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (isJson) {
        // JSON: serialize and download as .json file
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob    = new Blob([jsonStr], { type: "application/json" });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement("a");
        a.href        = url;
        a.download    = `${activePresetName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // CSV / XLS: binary blob download
        const mimeTypes = {
          csv: "text/csv",
          xls: "application/vnd.ms-excel",
        };
        const mimeType = mimeTypes[selectedFormat] || "application/octet-stream";
        const blob = res.data instanceof Blob
          ? new Blob([res.data], { type: mimeType })
          : new Blob([res.data], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `${activePresetName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setShowPopup(false);
      fetchSavedConfigs(savedPage);
    } catch (err) {
      console.error("Export failed:", err);
      const msg = err.response?.data?.error || err.message || "Export failed. Please try again.";
      alert(msg);
    } finally {
      setExporting(false);
    }
  };

  // ── Template Editor CRUD (Admin Only - Rule 16 constraints) ───────────────
  const handleOpenTemplateModal = (tpl = null) => {
    if (tpl) {
      setEditTemplateId(tpl.id);
      setTemplateTitle(tpl.title);
      setTemplateDescription(tpl.description || "");
      setTemplateColumns(tpl.columns || []);
      setTemplateEnabled(tpl.enabled !== 0);
    } else {
      setEditTemplateId(null);
      setTemplateTitle("");
      setTemplateDescription("");
      setTemplateColumns(selectedColumns.length > 0 ? selectedColumns : ["vm_name", "status"]);
      setTemplateEnabled(true);
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateTitle.trim()) {
      alert("Title is required");
      return;
    }
    if (templateColumns.length === 0) {
      alert("Select at least one column");
      return;
    }
    try {
      const activeFilters = {
        status: filterStatus,
        os: filterOS,
        cluster: filterCluster,
        node: filterNode,
        gpu: filterGpu,
        assigned: filterAssigned
      };

      const payload = {
        title: templateTitle.trim(),
        description: templateDescription.trim(),
        default_columns: templateColumns,
        default_filters: activeFilters,
        enabled: templateEnabled ? 1 : 0
      };

      if (editTemplateId) {
        await proxmoxApi.put(`/proxmox/report/templates/${editTemplateId}`, payload);
      } else {
        await proxmoxApi.post("/proxmox/report/templates", payload);
      }
      
      alert("Template saved successfully!");
      setShowTemplateModal(false);
      fetchTemplates();
    } catch (err) {
      console.error("Template save failed:", err);
      const msg = err.response?.data?.error || "Failed to save template.";
      alert(msg);
    }
  };

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await proxmoxApi.delete(`/proxmox/report/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error("Delete template failed:", err);
      alert("Failed to delete template.");
    }
  };

  const handleCloneTemplate = async (tpl, e) => {
    e.stopPropagation();
    try {
      const payload = {
        title: `${tpl.title} (Copy)`,
        description: tpl.description || "",
        default_columns: tpl.columns,
        default_filters: tpl.filters || {},
        enabled: tpl.enabled
      };
      await proxmoxApi.post("/proxmox/report/templates", payload);
      alert("Template cloned successfully!");
      fetchTemplates();
    } catch (err) {
      console.error("Clone failed:", err);
      alert("Failed to clone template.");
    }
  };

  const favoritesList = useMemo(() => {
    return savedConfigs.filter((c) => c.is_favorite);
  }, [savedConfigs]);

  const totalPages = Math.ceil(savedTotal / 5) || 1;

  if (loading) {
    return (
      <PageContainer title="Custom Reports">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading infrastructure data..." />
        </div>
      </PageContainer>
    );
  }

  const selectClass = "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inputClass = "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <PageContainer
      title="Dynamic Report Operations Center"
      description="Build customizable report configs, manage system templates, and view audit history logs."
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {/* ── SECTION A: Quick Filter Presets ──────────────────────────────── */}
      <div className="mb-5">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Quick Filter Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_PRESETS.map((fp) => (
            <button
              key={fp.id}
              onClick={() => applyFilterPreset(fp)}
              title={fp.description}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all ${accentBg} ${accentText} hover:border-current`}
            >
              {fp.label}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 transition-all flex items-center gap-1.5"
            >
              <X size={13} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION B: Filter Builder ─────────────────────────────────────── */}
      <Card className="mb-5 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setFiltersOpen((p) => !p)}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
            <Filter size={15} className={accentText} /> Filter Builder
            {activeFilterCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${accentBg} ${accentText}`}>
                {activeFilterCount} active
              </span>
            )}
          </div>
          {filtersOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {filtersOpen && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {/* Status */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
                  <option value="all">All</option>
                  {filterOptions.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* OS */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">OS</label>
                <select value={filterOS} onChange={(e) => setFilterOS(e.target.value)} className={selectClass}>
                  <option value="all">All</option>
                  {filterOptions.osList.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Cluster */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cluster</label>
                <select value={filterCluster} onChange={(e) => setFilterCluster(e.target.value)} className={selectClass}>
                  <option value="all">All</option>
                  {filterOptions.clusters.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Node */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Node</label>
                <select value={filterNode} onChange={(e) => setFilterNode(e.target.value)} className={selectClass}>
                  <option value="all">All</option>
                  {filterOptions.nodes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* GPU */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">GPU</label>
                <select value={filterGpu} onChange={(e) => setFilterGpu(e.target.value)} className={selectClass}>
                  <option value="all">All</option>
                  <option value="yes">GPU Enabled</option>
                  <option value="no">No GPU</option>
                </select>
              </div>

              {/* Ownership */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ownership</label>
                <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} className={selectClass}>
                  <option value="all">All</option>
                  <option value="yes">Assigned</option>
                  <option value="no">Unassigned</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Created From</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={selectClass} />
              </div>

              {/* Date To */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Created To</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={selectClass} />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {filterStatus   !== "all" && <FilterTag label={`Status: ${filterStatus}`}     onRemove={() => setFilterStatus("all")} />}
                {filterOS       !== "all" && <FilterTag label={`OS: ${filterOS}`}              onRemove={() => setFilterOS("all")} />}
                {filterCluster  !== "all" && <FilterTag label={`Cluster: ${filterCluster}`}   onRemove={() => setFilterCluster("all")} />}
                {filterNode     !== "all" && <FilterTag label={`Node: ${filterNode}`}          onRemove={() => setFilterNode("all")} />}
                {filterGpu      !== "all" && <FilterTag label={`GPU: ${filterGpu}`}            onRemove={() => setFilterGpu("all")} />}
                {filterAssigned !== "all" && <FilterTag label={`Assigned: ${filterAssigned}`} onRemove={() => setFilterAssigned("all")} />}
                {filterDateFrom           && <FilterTag label={`From: ${filterDateFrom}`}     onRemove={() => setFilterDateFrom("")} />}
                {filterDateTo             && <FilterTag label={`To: ${filterDateTo}`}          onRemove={() => setFilterDateTo("")} />}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── SECTION C: KPI Summary (filtered) ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Matching VMs"     value={kpis.total}    icon={<Monitor size={18} />}    accentClass={`border-l-4 ${accentBorder}`} />
        <KpiCard label="Running"          value={kpis.running}  icon={<Activity size={18} />}   accentClass={`border-l-4 ${accentBorder}`} />
        <KpiCard label="Assigned"         value={kpis.assigned} icon={<HardDrive size={18} />}  accentClass={`border-l-4 ${accentBorder}`} />
        <KpiCard label="GPU Enabled"      value={kpis.gpu}      icon={<Cpu size={18} />}        accentClass={`border-l-4 ${accentBorder}`} />
      </div>

      {/* ── SECTION D: Favorites Section ─────────────────────────────────── */}
      {favoritesList.length > 0 && (
        <div className="mb-6 animate-fadeIn">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Star size={14} className="fill-amber-400 text-amber-400" /> Favorite Reports
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favoritesList.map((fav) => (
              <Card key={fav.id} className="p-4 border-l-4 border-l-amber-400 hover:shadow-md transition-all flex items-center justify-between group">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{fav.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">Used: {fav.usage_count || 0} times</div>
                </div>
                <button
                  onClick={() => openSavedReport(fav)}
                  className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg hover:bg-amber-100 transition"
                  title="Run configuration"
                >
                  <Play size={14} />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION E: Saved Report Configurations ───────────────────────── */}
      <div className="mb-6">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Saved Configurations
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Columns Count</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Usage stats</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {savedConfigs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => handleToggleFavorite(cfg.id, e)} className="text-slate-300 hover:text-amber-400">
                          <Star size={16} className={cfg.is_favorite ? "fill-amber-400 text-amber-400" : ""} />
                        </button>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{cfg.title}</div>
                          {cfg.description && <div className="text-[10px] text-slate-400 mt-0.5">{cfg.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{cfg.columns?.length || 0} fields</td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-slate-500">
                        <div>Count: <span className="font-bold">{cfg.usage_count || 0}</span></div>
                        {cfg.last_used_at && <div>Last used: <span className="font-mono text-slate-400">{cfg.last_used_at}</span></div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openSavedReport(cfg)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition"
                          title="Load and configure"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConfig(cfg.id, e)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {savedConfigs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-600 text-xs">
                      No report configurations have been saved yet. Use the Builder and click Save Config.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t bg-slate-50 dark:bg-slate-800/10">
              <div className="text-xs text-slate-500">Page {savedPage} of {totalPages}</div>
              <div className="flex gap-2">
                <button
                  disabled={savedPage === 1}
                  onClick={() => setSavedPage(savedPage - 1)}
                  className="px-2.5 py-1 rounded border disabled:opacity-50 text-xs bg-white"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  disabled={savedPage === totalPages}
                  onClick={() => setSavedPage(savedPage + 1)}
                  className="px-2.5 py-1 rounded border disabled:opacity-50 text-xs bg-white"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── SECTION F: Report Templates (Stage 5 Feature 6) ──────────────── */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Report Presets & System Templates
          </div>
          {role === "admin" && (
            <button
              onClick={() => handleOpenTemplateModal(null)}
              className="px-3 py-1 btn-premium-primary text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus size={13} /> Add Template
            </button>
          )}
        </div>

        {templates.length === 0 ? (
          <Card className="p-6 text-center text-slate-400 dark:text-slate-600 border border-dashed">
            <FileText className="mx-auto mb-2 opacity-50" size={32} />
            <div className="text-xs font-semibold">No report presets available.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((preset) => (
              <Card
                key={preset.id || preset.title}
                className={`p-5 cursor-pointer border-2 hover:shadow-md transition-all duration-200 group flex flex-col justify-between ${
                  preset.enabled === 0 ? "border-slate-200 opacity-60" : "border-transparent"
                }`}
                onClick={() => {
                  if (preset.enabled !== 0 || role === "admin") openPreset(preset);
                }}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                      {preset.title}
                    </div>
                    {preset.enabled === 0 && <Badge variant="warning">Disabled</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{preset.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {preset.columns.slice(0, 3).map((col) => (
                      <span key={col} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${accentBg} ${accentText}`}>
                        {col}
                      </span>
                    ))}
                    {preset.columns.length > 3 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                        +{preset.columns.length - 3}
                      </span>
                    )}
                  </div>
                  
                  {role === "admin" ? (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenTemplateModal(preset)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-blue-600"
                        title="Edit properties"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={(e) => handleCloneTemplate(preset, e)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600"
                        title="Clone preset"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(preset.id, e)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-red-500"
                        title="Delete template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <Download size={14} className={`${accentText} shrink-0`} />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION G: Filtered VM Table Preview ─────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Monitor size={15} className={accentText} /> Filtered VM Preview
          </div>
          <Badge variant="info">{filteredVms.length} / {mergedVms.length} VMs</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                {["VM Name", "OS", "Status", "Cluster", "Node", "CPU", "RAM", "GPU", "Assigned"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVms.slice(0, 50).map((vm, i) => (
                <tr key={vm.vm_uuid || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{vm.vm_name || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">{vm.os || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (vm.status || "").toLowerCase() === "running"
                        ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    }`}>{ (vm.status || "—").toUpperCase() }</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{vm.cluster_name || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{vm.node_name    || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{vm.cpus         || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{vm.max_memory   || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {vm.gpu
                      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400">GPU</span>
                      : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {vm.isAssigned
                      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Yes</span>
                      : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVms.length > 50 && (
            <div className="p-4 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
              Showing first 50 of {filteredVms.length} VMs. Export report for full data.
            </div>
          )}
          {filteredVms.length === 0 && (
            <div className="p-12 text-center text-slate-400 dark:text-slate-600 text-sm">
              No VMs match the current filter configuration.
            </div>
          )}
        </div>
      </Card>

      {/* ── Report Config Popup ─────────────────────────────────────────────── */}
      {showPopup && (
        <ReportPopup
          availableColumns={ALL_REPORT_FIELDS}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          onClose={() => setShowPopup(false)}
          onDownload={handleDownload}
          onSave={handleOpenSaveModal}
        />
      )}

      {/* ── SAVE CONFIG MODAL ──────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[2000] p-4">
          <Card className="bg-white dark:bg-slate-900 w-full max-w-md p-6 shadow-xl rounded-2xl relative border">
            <button onClick={() => setShowSaveModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-500" /> Save Report Configuration
            </h3>
            <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g. GPU Infrastructure Allocation"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g. Tracks specific columns for GPU enabled VM servers..."
                  className={inputClass}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-5 py-2 btn-premium-secondary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-premium-primary text-sm font-semibold"
                >
                  Save Config
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── ADMIN TEMPLATE BUILDER MODAL (Stage 5 Feature 6) ───────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[2000] p-4">
          <Card className="bg-white dark:bg-slate-900 w-full max-w-xl p-6 shadow-xl rounded-2xl relative border max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowTemplateModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              {editTemplateId ? <Edit size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
              {editTemplateId ? "Edit System Template" : "Add System Preset Template"}
            </h3>
            <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Template Title</label>
                <input
                  type="text"
                  required
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="e.g. High Resource VM Inventory"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description for managers/users..."
                  className={inputClass}
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Columns Included</label>
                <div className="grid grid-cols-2 gap-2 border p-3 rounded-xl max-h-[150px] overflow-y-auto bg-slate-50 dark:bg-slate-800/20">
                  {ALL_REPORT_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={templateColumns.includes(f.key)}
                        onChange={(e) => {
                          if (e.target.checked) setTemplateColumns([...templateColumns, f.key]);
                          else setTemplateColumns(templateColumns.filter((c) => c !== f.key));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Default Filters</label>
                <div className="p-3 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400">
                  Filters currently active in your filter builder will be serialized and saved as default preset constraints.
                  <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
                    <div>status: <span className="font-bold">{filterStatus}</span></div>
                    <div>os: <span className="font-bold">{filterOS}</span></div>
                    <div>cluster: <span className="font-bold">{filterCluster}</span></div>
                    <div>node: <span className="font-bold">{filterNode}</span></div>
                    <div>gpu: <span className="font-bold">{filterGpu}</span></div>
                    <div>assigned: <span className="font-bold">{filterAssigned}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="tpl_enabled"
                  checked={templateEnabled}
                  onChange={(e) => setTemplateEnabled(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="tpl_enabled" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Enabled (visible to managers and standard users)
                </label>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-5 py-2 btn-premium-secondary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-premium-primary text-sm font-semibold flex items-center gap-1.5"
                >
                  <Check size={14} /> {editTemplateId ? "Update Template" : "Save Template"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
