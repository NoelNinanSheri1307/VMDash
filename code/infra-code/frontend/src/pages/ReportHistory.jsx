import React, { useState, useEffect } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loader from "../components/Loader";
import proxmoxApi from "../api/proxmoxapi";
import { Search, Filter, Calendar, User, FileText, ChevronLeft, ChevronRight, SlidersHorizontal, RefreshCw } from "lucide-react";

export default function ReportHistory() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const role = user.role || "user";
  
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [error, setError] = useState("");

  // Filter criteria states
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("");
  const [staffCode, setStaffCode] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit,
        query: search,
        format,
        staff_code: role === "admin" ? staffCode : undefined,
      };
      
      const res = await proxmoxApi.get("/proxmox/reports/history", { params });
      if (res.data) {
        setLogs(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load report logs:", err);
      setError("Unable to load report execution logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, format]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setSearch("");
    setFormat("");
    setStaffCode("");
    setPage(1);
    // Trigger immediate load
    setTimeout(() => fetchLogs(), 50);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const selectClass =
    "px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";
  const inputClass =
    "px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

  return (
    <PageContainer
      title="Report Execution History"
      description={
        role === "admin"
          ? "Unrestricted audit logs of all report generation events across VMDash infrastructure."
          : "Audit list of your past report downloads and exports."
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {/* FILTER BUILDER PANEL */}
      <Card className="p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Search Report Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className={inputClass}
              />
              <button type="submit" className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <Search size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              File Format
            </label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectClass}>
              <option value="">All Formats</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="xls">Excel (XLS)</option>
              <option value="json">JSON</option>
            </select>
          </div>

          {role === "admin" && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by User Staff Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  placeholder="e.g. VS10106"
                  className={inputClass}
                />
                <User className="absolute right-2.5 top-2.5 text-slate-400" size={16} />
              </div>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Filter size={15} /> Apply
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center"
              title="Reset Filters"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </form>
      </Card>

      {/* RESULTS LIST TABLE */}
      {loading ? (
        <div className="flex justify-center items-center h-[30vh]">
          <Loader text="Loading execution logs..." />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" /> Export Logs History
            </h3>
            <Badge variant="info">{total} total items</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  {["Generated By", "Report Name", "Type", "Format", "VM Count", "Columns Used", "Generated At"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{log.staff_code}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{log.report_name}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                        {log.report_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.file_format === "pdf"
                          ? "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400"
                          : log.file_format === "xls"
                          ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : log.file_format === "csv"
                          ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                          : "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                      }`}>
                        {log.file_format.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">{log.vm_count} VMs</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={log.columns.join(", ")}>
                      {log.columns.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.generated_at}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 dark:text-slate-600 text-sm">
                      No report generation history found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION PANEL */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/10">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
}
