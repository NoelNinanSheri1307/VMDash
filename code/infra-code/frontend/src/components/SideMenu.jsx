import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { triggerVmRefresh } from "./eventHelpers";
import proxmoxApi from "../api/proxmoxapi";
import webApi from "../api/webapi";

const SideMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const role = user?.role;
  const staffCode = user?.staff_code || "N/A";

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const icons = {
    Home: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" />
      </svg>
    ),
    "Add Cluster": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="12" cy="18" r="3" />
        <path d="M6 9v2a3 3 0 003 3h6a3 3 0 003-3V9" />
      </svg>
    ),
    "Add VM": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 20h10" />
        <path d="M12 8v6m0 0H9m3 0h3" />
      </svg>
    ),
    "Proxmox VMs": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="6" rx="2" />
        <rect x="3" y="13" width="18" height="6" rx="2" />
        <path d="M7 8h.01M7 16h.01" />
      </svg>
    ),
    Dashboard: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 13h8V3H3v10Z" />
        <path d="M13 21h8V11h-8v10Z" />
        <path d="M13 3h8v6h-8V3Z" />
        <path d="M3 21h8v-6H3v6Z" />
      </svg>
    ),
    "Stall Dashboard": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="13" width="4" height="8" rx="1" />
        <rect x="9" y="9" width="4" height="12" rx="1" />
        <rect x="15" y="5" width="4" height="16" rx="1" />
        <path d="M3 21h18" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    "Add User": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
    Sync: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 0 0-15.5-6.36" />
        <path d="M3 4v6h6" />
        <path d="M3 12a9 9 0 0 0 15.5 6.36" />
        <path d="M21 20v-6h-6" />
      </svg>
    ),
    "Change Password": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
        <path d="M12 15v2" />
      </svg>
    ),
    "Clusters View": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    "Nodes View": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
    "Storage View": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
    "Division Usage": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    "Entity Usage": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    "Capacity Projections": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </svg>
    ),
    "Performance Trends": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    "Sync Logs": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    "User Directory": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    "VM Request Inbox": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
    "VM Ownership": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
    "Request VM": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    "My Analytics": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    "My Reports": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    "Custom Reports": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="15" x2="13" y2="15" />
        <polyline points="16 14 18 16 22 12" />
      </svg>
    ),
    "Report History": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
    "Audit Dashboard": (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    Logout: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 3v18a1 1 0 0 1-1 1h-6" />
      </svg>
    ),
  };

  const linkClasses = (path) =>
    `flex items-center gap-3 mx-2 my-[2px] px-3 py-2 rounded-xl transition-all duration-150
     text-[14px] font-medium tracking-wide
    ${
      location.pathname === path
        ? "bg-blue-600 text-white shadow-sm"
        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
    }`;

  const handleSync = () => {
    if (syncing) return;
    setConfirmModal({
      show: true,
      message: "Syncing can take time to complete. Do you want to proceed?",
      onConfirm: async () => {
        setSyncing(true);
        try {
          const post_urls = [
            // "/proxmox/cluster/sync",    removed because cluster entry is now manual. there is nothing to sync now for a cluster
            "/proxmox/nodes/sync",
            "/proxmox/storage/sync",
            "/proxmox/vms/sync",
          ];
          for (const url of post_urls) {
            await proxmoxApi.post(url);
          }
          setAlertModal({
            show: true,
            title: "Sync Success",
            message: "Sync completed successfully.",
            type: "success"
          });
          triggerVmRefresh();
        } catch (error) {
          console.error("Sync failed:", error);
          setAlertModal({
            show: true,
            title: "Sync Error",
            message: "Sync failed! Check console logs.",
            type: "error"
          });
        } finally {
          setSyncing(false);
          setIsOpen(false);
        }
      }
    });
  };

  const handleLogout = async () => {
    try {
      await webApi.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const adminLinks = [
    { category: "Core Operations", to: "/home", label: "Home" },
    { category: "Core Operations", to: "/proxmox/vms", label: "Proxmox VMs" },
    { category: "Core Operations", to: "/dashboard", label: "Dashboard" },
    { category: "Core Operations", to: "/stalldashboard", label: "Stall Dashboard" },
    
    { category: "VM & Provisioning Controls", to: "/administration/requests", label: "VM Request Inbox" },
    { category: "VM & Provisioning Controls", to: "/add", label: "Add VM" },
    { category: "VM & Provisioning Controls", to: "/administration/ownership", label: "VM Ownership" },
    
    { category: "Reports", to: "/reports/custom-reports", label: "Custom Reports" },
    { category: "Reports", to: "/reports/history", label: "Report History" },
    { category: "Reports", to: "/reports/audit-dashboard", label: "Audit Dashboard" },

    { category: "Account & System Center", to: "/administration/users-list", label: "User Directory" },
    { category: "Account & System Center", to: "/add-user", label: "Add User" },
    { category: "Account & System Center", to: "/administration/sync-logs", label: "Sync Logs" },
    { category: "Account & System Center", type: "action", label: syncing ? "Syncing..." : "Sync", onClick: handleSync },
    
    { category: "Settings", to: "/change-password", label: "Change Password" },
  ];

  const managerLinks = [
    { category: "Operational Dashboard", to: "/home", label: "Home" },
    { category: "Operational Dashboard", to: "/proxmox/vms", label: "Proxmox VMs" },
    { category: "Operational Dashboard", to: "/dashboard", label: "Dashboard" },
    { category: "Operational Dashboard", to: "/stalldashboard", label: "Stall Dashboard" },
    
    { category: "Infrastructure State", to: "/infrastructure/clusters", label: "Clusters View" },
    { category: "Infrastructure State", to: "/infrastructure/nodes", label: "Nodes View" },
    { category: "Infrastructure State", to: "/infrastructure/storage", label: "Storage View" },
    
    { category: "Capacity & Resource Analytics", to: "/analytics/division-usage", label: "Division Usage" },
    { category: "Capacity & Resource Analytics", to: "/analytics/entity-usage", label: "Entity Usage" },
    { category: "Capacity & Resource Analytics", to: "/analytics/capacity-projection", label: "Capacity Projections" },
    { category: "Capacity & Resource Analytics", to: "/monitoring/trends", label: "Performance Trends" },

    { category: "Reports", to: "/reports/custom-reports", label: "Custom Reports" },
    { category: "Reports", to: "/reports/history", label: "Report History" },
    
    { category: "Settings", to: "/change-password", label: "Change Password" },
  ];

  const userLinks = [
    { category: "Personal Resources", to: "/home", label: "Home" },
    { category: "Personal Resources", to: "/proxmox/vms", label: "Proxmox VMs" },
    
    { category: "Request Self-Service", to: "/user/request-vm", label: "Request VM" },
    { category: "Request Self-Service", to: "/analytics/my-analytics", label: "My Analytics" },

    { category: "Reports", to: "/reports/my-reports", label: "My Reports" },
    { category: "Reports", to: "/reports/history", label: "Report History" },
    
    { category: "Settings", to: "/change-password", label: "Change Password" },
  ];

  const getCategorizedLinks = () => {
    if (role === "admin") return adminLinks;
    if (role === "manager") return managerLinks;
    return userLinks;
  };

  const links = getCategorizedLinks();

  const renderNavLinks = () => {
    let currentCategory = "";
    const rendered = [];

    links.forEach((link, index) => {
      if (link.category !== currentCategory) {
        currentCategory = link.category;
        rendered.push(
          <div 
            key={`cat-header-${currentCategory}`} 
            className="px-5 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            {currentCategory}
          </div>
        );
      }

      if (link.type === "action") {
        rendered.push(
          <button
            key={`action-${index}`}
            onClick={link.onClick}
            disabled={link.isSync && syncing}
            className="flex items-center gap-3 mx-2 my-[2px] px-3 py-2 rounded-xl text-[14px] font-medium tracking-wide transition-all duration-150 text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60 disabled:cursor-not-allowed w-[calc(100%-16px)]"
          >
            <span className="w-9 h-9 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 bg-white">
              {icons[link.label] || icons.Sync}
            </span>
            <span className="truncate">{link.label}</span>
          </button>
        );
      } else {
        rendered.push(
          <Link
            key={`link-${link.to}`}
            to={link.to}
            onClick={closeMenu}
            className={linkClasses(link.to)}
          >
            <span
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 border-blue-100 ${location.pathname === link.to ? "bg-blue-100" : "bg-white"}`}
            >
              {React.cloneElement(icons[link.label] || icons.Home, {
                className: `w-5 h-5 ${location.pathname === link.to ? "text-blue-600" : "text-blue-600"}`
              })}
            </span>
            <span className="truncate">{link.label}</span>
          </Link>
        );
      }
    });

    return rendered;
  };

  return (
    <>
      {/* TOP BAR */}
      <div className="w-full h-[64px] flex items-center px-5 bg-gradient-to-r from-indigo-600 to-purple-700 shadow-md">
        <button
          className="relative w-9 h-8 flex items-center justify-center"
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          <span
            className={`absolute h-[3px] w-7 rounded bg-white transition-all duration-300 ${
              isOpen ? "top-1/2 rotate-45" : "top-[8px]"
            }`}
          />
          <span
            className={`absolute h-[3px] w-7 rounded bg-white transition-all duration-300 ${
              isOpen ? "opacity-0" : "top-[15px]"
            }`}
          />
          <span
            className={`absolute h-[3px] w-7 rounded bg-white transition-all duration-300 ${
              isOpen ? "top-1/2 -rotate-45" : "top-[22px]"
            }`}
          />
        </button>

        <h1 className="ml-3 text-white font-bold text-[20px] tracking-wide">
          Infra Management
        </h1>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={closeMenu} />
      )}

      <nav
        className={`fixed top-[64px] left-0 z-50 h-[calc(100vh-64px)] w-[290px] bg-white border-r shadow-xl transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto py-3">
            {renderNavLinks()}
          </div>

          <div className="border-t px-5 py-3 bg-blue-50">
            <div className="text-[13px] text-gray-700 mb-2">
              <span className="font-semibold">Staff Code:</span> {staffCode}
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-xl bg-gray-900 text-white text-[14px] font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
            >
              {icons.Logout}
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Action</h3>
            <p className="text-sm text-slate-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ show: false, message: "", onConfirm: null });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <h3 className={`text-lg font-bold mb-2 ${alertModal.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {alertModal.title}
            </h3>
            <p className="text-sm text-slate-600 mb-6">{alertModal.message}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
                className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideMenu;
