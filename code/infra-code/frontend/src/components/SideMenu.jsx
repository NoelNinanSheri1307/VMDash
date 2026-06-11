import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { triggerVmRefresh } from "./eventHelpers";
import proxmoxApi from "../api/proxmoxapi";
import webApi from "../api/webapi";

const SideMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
     text-[15px] font-medium tracking-wide
    ${
      location.pathname === path
        ? "bg-blue-600 text-white shadow-sm"
        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
    }`;

  const handleSync = async () => {
    if (syncing) return;
    const confirmSync = window.confirm("Syncing can take time to complete. Do you want to proceed?");
    if (!confirmSync) return;

    setSyncing(true);
    try {
      const post_urls = [
        "/proxmox/cluster/sync",
        "/proxmox/nodes/sync",
        "/proxmox/storage/sync",
        "/proxmox/vms/sync",
      ];
      for (const url of post_urls) {
        await proxmoxApi.post(url);
      }
      alert("Sync completed successfully");
      triggerVmRefresh();
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync failed! Check console logs");
    } finally {
      setSyncing(false);
      setIsOpen(false);
    }
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
      window.location.replace("/login");
    }
  };

  const adminLinks = [
    { to: "/home", label: "Home" },
    { to: "/add-cluster", label: "Add Cluster" },
    { to: "/add", label: "Add VM" },
    { to: "/proxmox/vms", label: "Proxmox VMs" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/stalldashboard", label: "Stall Dashboard" },
    { to: "/add-user", label: "Add User" },
    { type: "action", label: syncing ? "Syncing..." : "Sync", onClick: handleSync },
    { to: "/change-password", label: "Change Password" },
  ];

  const viewOnlyLinks = [
    { to: "/home", label: "Home" },
    { to: "/proxmox/vms", label: "Proxmox VMs" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/stalldashboard", label: "Stall Dashboard" },
    { to: "/change-password", label: "Change Password" },
  ];

  const links = role === "admin" ? adminLinks : viewOnlyLinks;

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
            {links.map((link) =>
              link.type === "action" ? (
                <button
                  key={link.label}
                  onClick={link.onClick}
                  disabled={link.isSync && syncing}
                  className="flex items-center gap-3 mx-2 my-[2px] px-3 py-2 rounded-xl text-[15px] font-medium tracking-wide transition-all duration-150 text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="w-9 h-9 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 bg-white">
                    {icons[link.label] || icons.Sync}
                  </span>
                  <span className="truncate">{link.label}</span>
                </button>
              ) : (
                <Link
                  key={link.to}
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
              )
            )}
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
    </>
  );
};

export default SideMenu;
