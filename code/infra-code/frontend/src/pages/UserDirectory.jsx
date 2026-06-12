import React from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Users, UserPlus, Key, ShieldAlert, Edit, Search, ShieldCheck, Shield } from "lucide-react";

export default function UserDirectory() {
  const dummyUsers = [
    {
      staffCode: "VS10106",
      name: "AJITH MR",
      center: "MME",
      division: "AMG",
      role: "admin",
      status: "active",
      lastLogin: "2026-06-12 13:10:04",
    },
    {
      staffCode: "VS10204",
      name: "ASHOK KUMAR K",
      center: "MSA",
      division: "BHPD",
      role: "manager",
      status: "active",
      lastLogin: "2026-06-12 11:22:15",
    },
    {
      staffCode: "VS10124",
      name: "ANJANA S J",
      center: "AVN",
      division: "FPSD",
      role: "user",
      status: "active",
      lastLogin: "2026-06-12 09:15:30",
    },
    {
      staffCode: "VS10156",
      name: "ABHILASH KS",
      center: "PCM",
      division: "ASD",
      role: "user",
      status: "inactive",
      lastLogin: "2026-06-08 14:02:40",
    }
  ];

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldAlert size={12} /> ADMIN
          </span>
        );
      case "manager":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldCheck size={12} /> MANAGER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Shield size={12} /> USER
          </span>
        );
    }
  };

  return (
    <PageContainer
      title="User Directory & Credentials Console"
      description="View, register, and modify employee credentials, access levels, and security profiles mapped to the VMDash environment."
      actions={
        <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-md">
          <UserPlus size={16} /> Add User Role
        </button>
      }
    >
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Users</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">24</div>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Admins</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">3</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Managers</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">5</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
            <Shield size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Today</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">18</div>
          </div>
        </Card>
      </div>

      {/* Main Table view */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
          <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">Registered Portal Profiles</h3>
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search user codes..." 
              className="border-none bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none max-w-[150px]" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs bg-white dark:bg-slate-900/40">
            <thead className="bg-slate-50/50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Staff Code</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Center</th>
                <th className="px-4 py-3">Division</th>
                <th className="px-4 py-3">System Role</th>
                <th className="px-4 py-3">Registry Status</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-350">
              {dummyUsers.map((u) => (
                <tr key={u.staffCode} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20">
                  <td className="px-4 py-3.5 font-bold font-mono text-slate-850 dark:text-slate-200">{u.staffCode}</td>
                  <td className="px-4 py-3.5 font-semibold">{u.name}</td>
                  <td className="px-4 py-3.5">{u.center}</td>
                  <td className="px-4 py-3.5">{u.division}</td>
                  <td className="px-4 py-3.5">{getRoleBadge(u.role)}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={u.status === "active" ? "success" : "default"}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-400 dark:text-slate-500">{u.lastLogin}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition" title="Modify Permissions">
                        <Edit size={13} />
                      </button>
                      <button className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition" title="Reset Credentials">
                        <Key size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
