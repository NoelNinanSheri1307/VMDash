import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import webApi from "../api/webapi";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loader from "../components/Loader";
import { Plus, Users, Monitor, Cpu, HardDrive, Filter, Search } from "lucide-react";

export default function Home() {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("vm_name");
  const [sortAsc, setSortAsc] = useState(true);
  
  // Search & Filter
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("");

  const navigate = useNavigate();

  // Retrieve user session info
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

  const fetchRegisteredVms = async () => {
    try {
      setLoading(true);
      const res = await webApi.get("/vms");
      let fetchedVms = res.data;
      if (role === "user") {
        fetchedVms = fetchedVms.filter(vm => 
          vm.users && vm.users.some(u => u.staff_code === staffCode)
        );
      }
      setVms(fetchedVms);
      setError("");
    } catch (err) {
      console.error("Failed to fetch registered VMs:", err);
      setError("Unable to communicate with the registry service database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisteredVms();
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Filter VMs
  const filteredVms = vms.filter((vm) => {
    if (!searchField || !search) return true;
    const value = vm[searchField];
    if (value === undefined || value === null) return false;
    return value.toString().toLowerCase().includes(search.toLowerCase());
  });

  // Sort VMs
  const sortedVms = [...filteredVms].sort((a, b) => {
    const valA = a[sortKey] ?? "";
    const valB = b[sortKey] ?? "";
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc 
      ? valA.toString().localeCompare(valB.toString()) 
      : valB.toString().localeCompare(valA.toString());
  });

  if (loading) {
    return (
      <PageContainer title="Registered VMs">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader text="Loading registered VMs database..." />
        </div>
      </PageContainer>
    );
  }

  // Summary Metrics
  const totalCount = vms.length;
  const totalCores = vms.reduce((acc, curr) => acc + (Number(curr.cores) || 0), 0);
  const totalRam = vms.reduce((acc, curr) => acc + (Number(curr.ram) || 0), 0);

  return (
    <PageContainer
      title={role === "user" ? "My Registered VMs" : "Registered VMs"}
      description="The official organizational catalog of provisioned virtual environments and division assignments."
      actions={
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchRegisteredVms} 
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Refresh
          </button>
          {role === "admin" && (
            <button
              onClick={() => navigate("/add")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              <Plus size={16} /> Add VM Provision
            </button>
          )}
        </div>
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Monitor size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Registered</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalCount} <span className="text-sm text-slate-500 font-medium">VMs</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Cpu size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned Cores</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalCores} <span className="text-sm text-slate-500 font-medium">Cores</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned RAM</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {totalRam} <span className="text-sm text-slate-500 font-medium">GB</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">User Enrolment</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Active <span className="text-sm text-slate-500 font-medium">Directory</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Field Selector */}
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-1.5 transition w-full sm:min-w-[200px]">
            <div className="w-8 h-8 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center mr-2">
              <Filter size={16} />
            </div>
            <select 
              value={searchField} 
              onChange={(e) => setSearchField(e.target.value)} 
              className="flex-1 border-none bg-transparent px-1 py-1 text-sm text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Select filter field</option>
              <option value="vm_name">VM Name</option>
              <option value="host_name">Host Name</option>
              <option value="environment">Environment</option>
              <option value="cluster">Cluster</option>
              <option value="ip_address">IP Address</option>
              <option value="mac_address">MAC Address</option>
              <option value="os_type">OS Type</option>
              <option value="division">Division</option>
              <option value="source">Source</option>
              <option value="narc">NARC</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-1.5 transition w-full sm:min-w-[240px]">
            <div className="w-8 h-8 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center mr-2">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search registry..." 
              disabled={!searchField} 
              className={`flex-1 border-none bg-transparent px-1 py-1 text-sm text-slate-800 dark:text-slate-200 outline-none ${!searchField ? "cursor-not-allowed text-slate-400" : ""}`} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <table className="w-full border-collapse text-left text-sm bg-white dark:bg-slate-900/40">
          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
            <tr>
              {[
                { key: "vm_name", label: "VM Name" },
                { key: "host_name", label: "Host Name" },
                { key: "environment", label: "Environment" },
                { key: "cluster", label: "Cluster" },
                { key: "ram", label: "RAM (GB)" },
                { key: "cores", label: "Cores" },
                { key: "ip_address", label: "IP" },
                { key: "mac_address", label: "MAC" },
                { key: "os_type", label: "OS Type" },
                { key: "disk_size", label: "Disk (GB)" },
                { key: "gpu", label: "GPU" },
                { key: "source", label: "Source" },
                { key: "narc", label: "NARC" },
                { key: "time_created", label: "Created" }
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3.5 font-semibold cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (sortAsc ? " ▲" : " ▼")}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3.5 font-semibold">Assigned Users</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sortedVms.length > 0 ? (
              sortedVms.map((vm, index) => (
                <tr 
                  key={index}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{vm.vm_name || "-"}</td>
                  <td className="px-4 py-3">{vm.host_name || "-"}</td>
                  <td className="px-4 py-3 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">{vm.environment || "-"}</td>
                  <td className="px-4 py-3">{vm.cluster || "-"}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">{vm.ram || "-"}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">{vm.cores || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{vm.ip_address || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{vm.mac_address || "-"}</td>
                  <td className="px-4 py-3 text-xs">{vm.os_type || "-"}</td>
                  <td className="px-4 py-3 text-center font-mono">{vm.disk_size || "-"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{vm.gpu || "-"}</td>
                  <td className="px-4 py-3 text-xs">{vm.source || "-"}</td>
                  <td className="px-4 py-3 text-xs">{vm.narc || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{vm.time_created || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5 min-w-[220px]">
                      {vm.users && vm.users.length > 0 ? (
                        vm.users.map((user, i) => (
                          <div 
                            key={i}
                            className="bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg text-xs leading-normal border border-slate-200/40 dark:border-slate-700/50"
                          >
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {user.staff_code} - {user.name}
                            </div>
                            <div className="text-slate-500 dark:text-slate-500">
                              {`${user.section || ""}/${user.division || ""}/${user.groupname || ""}/${user.entity || ""}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs italic">Unassigned</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="15" className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  No registered VMs found in the configuration registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}