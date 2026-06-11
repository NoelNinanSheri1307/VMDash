import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../theme/ThemeProvider";
import webApi from "../api/webapi";
import proxmoxApi from "../api/proxmoxapi";
import { triggerVmRefresh } from "../components/eventHelpers";
import {
  LayoutDashboard,
  Server,
  MonitorPlay,
  Activity,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  RefreshCw
} from "lucide-react";

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTheme, toggleTheme } = useTheme();

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

  // Handle collapsible sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); // run initially
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await webApi.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/login");
    }
  };

  // Define All Nav Items and Groupings
  const menuGroups = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      roles: ["admin", "manager", "user"],
      items: [
        { to: "/dashboard", label: role === "user" ? "My Dashboard" : "Overview" }
      ]
    },
    {
      id: "infrastructure",
      title: "Infrastructure",
      icon: <Server size={18} />,
      roles: ["admin", "manager"],
      items: [
        { to: "/infrastructure/nodes", label: "Nodes Status" },
        { to: "/infrastructure/clusters", label: "Clusters List" },
        { to: "/infrastructure/storage", label: "Storage Volumes" }
      ]
    },
    {
      id: "vms",
      title: "Virtual Machines",
      icon: <MonitorPlay size={18} />,
      roles: ["admin", "manager", "user"],
      items: [
        { to: "/proxmox/vms", label: role === "user" ? "My Virtual Machines" : "VM List" },
        { to: "/home", label: role === "user" ? "My Registered VMs" : "Registered VMs" }
      ]
    },
    {
      id: "monitoring",
      title: "Monitoring",
      icon: <Activity size={18} />,
      roles: ["admin", "manager"],
      items: [
        { to: "/stalldashboard", label: "Pressure Metrics" },
        { to: "/monitoring/trends", label: "Performance Trends" }
      ]
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: <BarChart3 size={18} />,
      roles: ["admin", "manager", "user"],
      items: role === "user" ? [
        { to: "/analytics/my-analytics", label: "My Analytics" }
      ] : [
        { to: "/analytics/entity-usage", label: "Entity Usage" },
        { to: "/analytics/division-usage", label: "Division Usage" },
        { to: "/analytics/capacity-projection", label: "Capacity Projections" }
      ]
    },
    {
      id: "reports",
      title: "Reports",
      icon: <FileSpreadsheet size={18} />,
      roles: ["admin", "manager", "user"],
      items: [
        { to: "/reports", label: role === "user" ? "My Reports" : "Custom Reports" }
      ]
    },
    {
      id: "administration",
      title: "Administration",
      icon: <ShieldCheck size={18} />,
      roles: ["admin"],
      items: [
        { to: "/add-user", label: "Add User Credentials" },
        { to: "/add", label: "Add VM Provision" },
        { to: "/administration/sync", label: "Sync Center" }
      ]
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Settings size={18} />,
      roles: ["admin", "manager", "user"],
      items: [
        { to: "/change-password", label: "Change Password" },
        { to: "/settings/profile", label: "My Profile" }
      ]
    }
  ];

  // Resolve current active page title
  const getPageTitle = () => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (location.pathname === item.to) {
          return item.label;
        }
      }
    }
    if (location.pathname === "/login") return "Login";
    return "Operations Center";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B1220] transition-colors duration-150">

      {/* SIDEBAR NAVIGATION */}
      <motion.aside
        animate={{ width: isSidebarOpen ? 280 : 72 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm z-30 shrink-0 relative"
      >
        {/* Brand / Toggle */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {isSidebarOpen ? (
            <span className="text-[17px] font-bold text-slate-800 dark:text-slate-100 tracking-wider">
              Infrastructure View
            </span>
          ) : (
            <span className="w-full text-center text-[15px] font-bold text-blue-700 dark:text-blue-500">
              VD
            </span>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Sync Action Button (Admin only) */}
        {role === "admin" && (
          <div className="p-3 shrink-0">
            <button
              onClick={() => navigate("/administration/sync")}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-150 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/30"
            >
              <RefreshCw size={14} />
              {isSidebarOpen && "Sync Center"}
            </button>
          </div>
        )}

        {/* Scrollable Navigation Menu Groups */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-4">
          {menuGroups
            .filter((group) => group.roles.includes(role))
            .map((group) => (
              <div key={group.id} className="space-y-1">
                {isSidebarOpen ? (
                  <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-600 uppercase flex items-center gap-2">
                    {group.icon}
                    <span>{group.title}</span>
                  </div>
                ) : (
                  <div className="w-full border-t border-slate-100 dark:border-slate-800 my-2" />
                )}

                {group.items.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-all duration-150
                        ${isActive
                          ? "bg-blue-700 dark:bg-blue-600 text-white shadow-sm"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-blue-700 dark:hover:text-blue-400"
                        }
                      `}
                    >
                      {!isSidebarOpen && <span className="shrink-0">{group.icon}</span>}
                      {isSidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
              <UserCheck size={18} />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
                  {staffCode}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-500 capitalize font-medium">
                  {role.replace("_", " ")}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* MOBILE HEADER DOCK */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <div className="md:hidden fixed top-[64px] left-0 w-[260px] h-[calc(100vh-64px)] z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto no-scrollbar p-4 space-y-4">
            {menuGroups
              .filter((group) => group.roles.includes(role))
              .map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-600 uppercase flex items-center gap-2">
                    {group.icon}
                    <span>{group.title}</span>
                  </div>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-all duration-150
                          ${isActive
                            ? "bg-blue-700 dark:bg-blue-600 text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }
                        `}
                      >
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
          </div>
        )}
      </AnimatePresence>

      {/* CONTENT ZONE CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* TOPBAR PANEL */}
        <header className="h-[64px] w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">

          {/* Mobile hamburger & Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-[18px] md:text-[20px] font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              {getPageTitle()}
            </h2>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme Mode"
            >
              {currentTheme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-semibold hover:bg-slate-800 dark:hover:bg-white transition"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* MAIN DISPLAY PORTAL */}
        <main className="flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
