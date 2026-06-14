import React, { useEffect, useMemo, useState } from "react";
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
  Monitor, Cpu, HardDrive, Database,
  FileText, Download, Star, Trash2, Play, Plus,
  Users, Activity, BarChart2, PieChart,
  ClipboardList, Shield, Server, ChevronLeft, ChevronRight, X
} from "lucide-react";

// ─── Plotly theme (user = red) ───────────────────────────────────────────────
const getPlotlyTheme = (theme) => {
  const isDark = theme === "dark";
  return {
    primaryColor: "#ef4444",
    colors: ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#dc2626"],
    layout: {
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { family: "Inter, Roboto, sans-serif", color: isDark ? "#cbd5e1" : "#475569", size: 11 },
      margin: { t: 30, b: 40, l: 40, r: 15 },
      showlegend: true,
      legend: { orientation: "h", y: -0.2, font: { size: 10, color: isDark ? "#cbd5e1" : "#475569" } },
      xaxis: {
        gridcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      },
      yaxis: {
        gridcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        tickfont: { color: isDark ? "#94a3b8" : "#64748b" }
      }
    }
  };
};

// ─── All available report columns (matching proxmox_backend/routes/report.py) ─
const ALL_REPORT_FIELDS = [
  { key: "vm_name",                label: "VM Name" },
  { key: "vm_uuid",                label: "UUID" },
  { key: "os",                     label: "OS" },
  { key: "status",                 label: "Status" },
  { key: "cpus",                   label: "CPUs" },
  { key: "max_memory",             label: "RAM (GB)" },
  { key: "max_disk",               label: "Disk (GB)" },
  { key: "cluster_name",           label: "Cluster" },
  { key: "node_name",              label: "Node" },
  { key: "ip",                     label: "IP Address" },
  { key: "mac",                    label: "MAC Address" },
  { key: "gpu",                    label: "GPU" },
  { key: "gpu_info",               label: "GPU Details" },
  { key: "uptime",                 label: "Uptime" },
  { key: "live_status",            label: "Live Status" },
  { key: "created_date",           label: "Created Date" },
  { key: "users_assigned",         label: "Users Assigned" },
  { key: "com_focal_point",        label: "COM Focal Point" },
  { key: "end_user_focal_point",   label: "End User Focal Point" },
  { key: "prometheus_status",      label: "Prometheus Status" },
  { key: "software_installed",     label: "Software Installed" },
  { key: "request_source",         label: "Request Source" },
];

// ─── Preset report templates fallback (Rule 18) ───────────────────────────────
const FALLBACK_TEMPLATES = [
  {
    id: "inventory",
    title: "VM Inventory Report",
    description: "Full inventory of your assigned virtual machines with specs.",
    columns: ["vm_name", "os", "status", "cluster_name", "node_name", "cpus", "max_memory", "max_disk"],
  },
  {
    id: "resources",
    title: "Resource Allocation Report",
    description: "CPU, RAM, and storage footprint across your assigned VMs.",
    columns: ["vm_name", "cpus", "max_memory", "max_disk", "gpu", "gpu_info", "status"],
  },
  {
    id: "status",
    title: "VM Status Report",
    description: "Running, stopped, and live-status summary for your VMs.",
    columns: ["vm_name", "status", "live_status", "uptime", "node_name", "cluster_name"],
  },
  {
    id: "ownership",
    title: "Ownership Report",
    description: "Your ownership mapping — VMs linked to your staff profile.",
    columns: ["vm_name", "users_assigned", "com_focal_point", "end_user_focal_point", "os", "status"],
  },
];

// ─── KPI Card ────────────────-------------------------------------------------
function KpiCard({ icon, label, value, unit, accent = "red" }) {
  const colors = {
    red:  { bg: "bg-red-50 dark:bg-red-950/20",    text: "text-red-600 dark:text-red-400",    border: "border-l-red-500" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/20",  text: "text-blue-600 dark:text-blue-400",  border: "border-l-blue-500" },
  };
  const c = colors[accent] || colors.red;
  return (
    <Card className={`flex items-center gap-4 border-l-4 ${c.border}`}>
      <div className={`p-3 ${c.bg} ${c.text} rounded-xl shrink-0`}>{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
          {value} {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Component ────────────────-------------------------------------------
export default function MyReports() {
  const { currentTheme } = useTheme();
  const tc = getPlotlyTheme(currentTheme);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const staffCode = user.staff_code || "";

  const [allVms, setAllVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Saved configs & templates states
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);
  const [savedPage, setSavedPage] = useState(1);
  const [savedTotal, setSavedTotal] = useState(0);

  // active generator metadata
  const [activePresetName, setActivePresetName] = useState("Custom Report");
  const [activePresetType, setActivePresetType] = useState("custom");
  const [activeSavedReportId, setActiveSavedReportId] = useState(null);

  // Save Config form state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  // Report popup state
  const [showPopup, setShowPopup] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

  // ── Fetch dynamic templates & saved configs ───────────────────────────────
  const fetchSavedConfigs = async (p = 1) => {
    try {
      const res = await proxmoxApi.get("/proxmox/reports/saved", { params: { page: p, limit: 5 } });
      if (res.data) {
        setSavedConfigs(res.data.data || []);
        setSavedTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load saved report configurations:", err);
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
        setTemplates([]); // empty templates state (Rule 18)
      }
    } catch (err) {
      // Soft failure (Rule 18 fallback)
      console.error("Failed to fetch dynamic templates, using static fallback:", err);
      setTemplates(FALLBACK_TEMPLATES);
    }
  };

  useEffect(() => {
    fetchSavedConfigs(savedPage);
  }, [savedPage]);

  // ── Fetch Main Assigned VMs & Presets ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await webApi.get("/vms");
        setAllVms(res.data || []);
        setError("");
        
        await fetchTemplates();
        await fetchSavedConfigs(1);
      } catch (err) {
        console.error("MyReports fetch error:", err);
        setError("Unable to load assigned VM data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Filter to only my assigned VMs ────────────────────────────────────────
  const myVms = useMemo(() => {
    return allVms.filter(
      (vm) => vm.users && vm.users.some((u) => u.staff_code === staffCode)
    );
  }, [allVms, staffCode]);

  const myUuids = useMemo(() => myVms.map((v) => v.vm_uuid).filter(Boolean), [myVms]);

  // ── KPI Metrics (derived strictly from assigned VMs only) ─────────────────
  const kpis = useMemo(() => {
    const total   = myVms.length;
    const running = myVms.filter((v) => (v.status || "").toLowerCase() === "running").length;
    const stopped = myVms.filter((v) => (v.status || "").toLowerCase() === "stopped").length;
    const cpu     = myVms.reduce((s, v) => s + (Number(v.cores) || 0), 0);
    const ram     = myVms.reduce((s, v) => s + (Number(v.ram)   || 0), 0);
    const disk    = myVms.reduce((s, v) => s + (Number(v.disk_size) || 0), 0);
    return { total, running, stopped, cpu, ram, disk };
  }, [myVms]);

  // ── Chart Data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const statusCounts = {};
    const osCounts = {};
    const clusterCounts = {};
    myVms.forEach((vm) => {
      const st  = (vm.status || "stopped").toLowerCase();
      const os  = vm.os || "Unknown";
      const cls = vm.cluster || "Unknown Cluster";
      statusCounts[st]  = (statusCounts[st]  || 0) + 1;
      osCounts[os]       = (osCounts[os]       || 0) + 1;
      clusterCounts[cls] = (clusterCounts[cls] || 0) + 1;
    });
    const names  = myVms.map((v) => v.vm_name  || "Unnamed");
    const cores  = myVms.map((v) => Number(v.cores)    || 0);
    const ram    = myVms.map((v) => Number(v.ram)      || 0);
    const disk   = myVms.map((v) => Number(v.disk_size)|| 0);
    return { statusCounts, osCounts, clusterCounts, names, cores, ram, disk };
  }, [myVms]);

  // ── Export handler (Rule 11/13 wraps original pipeline) ─────────────────
  const handleDownload = async () => {
    if (!selectedFormat) { alert("Please select a format."); return; }
    if (selectedColumns.length === 0) { alert("Please select at least one column."); return; }
    try {
      setExporting(true);

      const isJson = selectedFormat === "json";

      const res = await proxmoxApi.post(
        "/proxmox/report",
        {
          columns: selectedColumns,
          format: selectedFormat,
          uuids: myUuids,
          staff_code: staffCode,
          report_name: activePresetName,
          report_type: activePresetType,
          saved_report_id: activeSavedReportId
        },
        { responseType: isJson ? "json" : "blob" }
      );

      if (selectedFormat === "pdf") {
        // PDF: receive as blob/html, open in new window with print trigger
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
          // Fallback if popup blocked — download as .html
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
        // JSON: stringify and trigger download
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
        // CSV / XLS
        const mimeTypes = { csv: "text/csv", xls: "application/vnd.ms-excel" };
        const mimeType  = mimeTypes[selectedFormat] || "application/octet-stream";
        const blob = new Blob([res.data], { type: mimeType });
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
      // Reload lists to capture updated execution counters
      fetchSavedConfigs(savedPage);
    } catch (err) {
      console.error("Export failed:", err);
      const msg = err.response?.data?.error || err.message || "Export failed. Please try again.";
      alert(msg);
    } finally {
      setExporting(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const openPreset = (preset) => {
    setSelectedColumns(preset.columns);
    setSelectedFormat("csv");
    setActivePresetName(preset.title);
    setActivePresetType(preset.id ? String(preset.id) : preset.title);
    setActiveSavedReportId(null);
    setShowPopup(true);
  };

  const openSavedReport = (report) => {
    setSelectedColumns(report.columns);
    setSelectedFormat("csv");
    setActivePresetName(report.title);
    setActivePresetType("saved");
    setActiveSavedReportId(report.id);
    setShowPopup(true);
  };

  const handleOpenSaveModal = () => {
    // Collect columns from current popup selections
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
      const payload = {
        title: saveTitle.trim(),
        description: saveDescription.trim(),
        columns: selectedColumns,
        filters: {} // Standard reports filters default to empty for users
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

  const favoritesList = useMemo(() => {
    return savedConfigs.filter((c) => c.is_favorite);
  }, [savedConfigs]);

  const totalPages = Math.ceil(savedTotal / 5) || 1;

  if (loading) {
    return (
      <PageContainer title="My Reports">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading your assigned VM data..." />
        </div>
      </PageContainer>
    );
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <PageContainer
      title="My Reports & Analytics"
      description={`Personalized report workspace. Sourced exclusively from VMs linked to Staff Code: ${staffCode}.`}
    >
      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {myVms.length === 0 && !error ? (
        <Card className="text-center py-16 text-slate-500">
          <Monitor className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={48} />
          <div className="text-lg font-bold">No Assigned VMs Found</div>
          <p className="text-sm mt-1 max-w-md mx-auto">
            No virtual machines are currently linked to your employee profile. Contact your administrator.
          </p>
        </Card>
      ) : (
        <>
          {/* ── SECTION A: KPI Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <KpiCard icon={<Monitor size={20} />}   label="My VMs"              value={kpis.total}   />
            <KpiCard icon={<Activity size={20} />}  label="Running"             value={kpis.running} />
            <KpiCard icon={<Server size={20} />}    label="Stopped"             value={kpis.stopped} />
            <KpiCard icon={<Cpu size={20} />}       label="My CPU Allocation"   value={kpis.cpu}     unit="Cores" />
            <KpiCard icon={<HardDrive size={20} />} label="My RAM Allocation"   value={kpis.ram}     unit="GB" />
            <KpiCard icon={<Database size={20} />}  label="My Storage Allocation" value={kpis.disk}  unit="GB" />
          </div>

          {/* ── SECTION B: Analytics Charts ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* VM Status Distribution */}
            <Card className="p-4 flex flex-col h-[340px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PieChart size={16} className="text-red-500" /> VM Status Distribution
                </h3>
                <Badge variant="info">My VMs</Badge>
              </div>
              <div className="flex-1">
                <Plot
                  data={[{
                    type: "pie", hole: 0.55,
                    labels: Object.keys(chartData.statusCounts).map((s) => s.toUpperCase()),
                    values: Object.values(chartData.statusCounts),
                    textinfo: "percent+value",
                    marker: { colors: tc.colors },
                    hoverinfo: "label+value+percent"
                  }]}
                  layout={{ ...tc.layout, autosize: true, margin: { t: 20, b: 20, l: 20, r: 20 } }}
                  useResizeHandler style={{ width: "100%", height: "100%" }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>
            </Card>

            {/* OS Distribution */}
            <Card className="p-4 flex flex-col h-[340px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart2 size={16} className="text-red-500" /> OS Distribution
                </h3>
                <Badge variant="info">My VMs</Badge>
              </div>
              <div className="flex-1">
                <Plot
                  data={[{
                    type: "bar",
                    x: Object.keys(chartData.osCounts),
                    y: Object.values(chartData.osCounts),
                    marker: { color: tc.primaryColor },
                    hoverinfo: "x+y"
                  }]}
                  layout={{ ...tc.layout, autosize: true, margin: { t: 20, b: 60, l: 40, r: 10 } }}
                  useResizeHandler style={{ width: "100%", height: "100%" }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>
            </Card>
          </div>

          {/* ── FAVOURITES RENDER PANEL (Stage 5 Feature 1) ───────────────── */}
          {favoritesList.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                <Star size={18} className="fill-amber-400 text-amber-400" /> Favorite Reports
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {favoritesList.map((fav) => (
                  <Card key={fav.id} className="p-4 border-l-4 border-l-amber-400 hover:shadow-md transition-all flex items-center justify-between group">
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{fav.title}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">Used: {fav.usage_count || 0} times</div>
                    </div>
                    <button
                      onClick={() => openSavedReport(fav)}
                      className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg hover:bg-amber-100 transition"
                      title="Run report config"
                    >
                      <Play size={15} />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION C: Dynamic Presets / Templates (Stage 5 Feature 6) ───── */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Report Presets</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              dynamic report presets. Select to customize columns and download.
            </p>
            {templates.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 dark:text-slate-600 border border-dashed">
                <FileText className="mx-auto mb-2 opacity-50" size={32} />
                <div className="text-xs font-semibold">No report presets available.</div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((preset) => (
                  <Card
                    key={preset.id}
                    className="p-5 cursor-pointer hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition-all duration-200 border-2 border-transparent group flex flex-col justify-between"
                    onClick={() => openPreset(preset)}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-red-500 transition-colors">
                        {preset.title}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {preset.columns.slice(0, 3).map((col) => (
                          <span key={col} className="text-[9px] px-1.5 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded font-mono">
                            {col}
                          </span>
                        ))}
                        {preset.columns.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                            +{preset.columns.length - 3}
                          </span>
                        )}
                      </div>
                      <Download size={14} className="text-red-500 shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION D: Saved Configurations List (Stage 5 Feature 1) ─────── */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">My Saved Reports</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Configurations you have saved. Star configs to pin them to favorites.
            </p>
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
                          You haven't saved any custom report templates yet. Configure columns and click "Save Config".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Saved Reports pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t bg-slate-50 dark:bg-slate-800/10">
                  <div className="text-xs text-slate-500">Page {savedPage} of {totalPages}</div>
                  <div className="flex gap-2">
                    <button
                      disabled={savedPage === 1}
                      onClick={() => setSavedPage(savedPage - 1)}
                      className="px-2.5 py-1 rounded border disabled:opacity-50 text-xs bg-white text-slate-700"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      disabled={savedPage === totalPages}
                      onClick={() => setSavedPage(savedPage + 1)}
                      className="px-2.5 py-1 rounded border disabled:opacity-50 text-xs bg-white text-slate-700"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── SECTION E: Assigned VMs Quick Table ──────────────────────── */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ClipboardList size={16} className="text-red-500" /> My Assigned VMs
              </h3>
              <Badge variant="info">{myVms.length} total</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    {["VM Name", "OS", "Status", "CPU", "RAM (GB)", "Disk (GB)", "Cluster"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myVms.map((vm, i) => (
                    <tr key={vm.vm_name || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{vm.vm_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{vm.os || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (vm.status || "").toLowerCase() === "running"
                            ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                        }`}>
                          {(vm.status || "stopped").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{vm.cores || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{vm.ram || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{vm.disk_size || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{vm.cluster || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── Report Config Popup ────────────────────────────────────────────── */}
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
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[2000] p-4 animate-fadeIn">
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
                  placeholder="e.g. My Storage allocation"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g. Columns for storage capacity tracking..."
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
    </PageContainer>
  );
}
