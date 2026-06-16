import React, { useState, useEffect } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Users, UserPlus, Key, ShieldAlert, Edit, Search, ShieldCheck, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import webApi from "../api/webapi";

export default function UserDirectory() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });

  // Modals state
  const [roleModal, setRoleModal] = useState({ show: false, staff_code: "", role: "" });
  const [resetModal, setResetModal] = useState({ show: false, staff_code: "", password: "" });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ staff_code: "", role: "user" });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user")) || {};
    setCurrentUser(storedUser);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await webApi.get("/auth/users");
      setUsers(res.data || []);
      setError("");
    } catch (err) {
      setError("Failed to retrieve user directory. Administrator authorization required.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleToggleStatus = (staffCode) => {
    setActionError("");
    setSuccessMsg("");
    if (currentUser?.staff_code === staffCode) {
      setActionError("You cannot activate or deactivate your own account.");
      return;
    }
    setConfirmModal({
      show: true,
      title: "Toggle User Status",
      message: `Are you sure you want to toggle status for user ${staffCode}?`,
      onConfirm: async () => {
        try {
          await webApi.post("/auth/users/toggle-status", { staff_code: staffCode });
          setSuccessMsg(`Status for user ${staffCode} updated successfully.`);
          fetchUsers();
        } catch (err) {
          setActionError(err.response?.data?.error || "Failed to update account status.");
        }
      }
    });
  };

  const handleRoleChangeSubmit = async () => {
    setActionError("");
    setSuccessMsg("");
    try {
      await webApi.post("/auth/users/change-role", {
        staff_code: roleModal.staff_code,
        role: roleModal.role
      });
      setSuccessMsg(`Role for user ${roleModal.staff_code} updated to ${roleModal.role} successfully.`);
      setRoleModal({ show: false, staff_code: "", role: "" });
      fetchUsers();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to change user role.");
    }
  };

  const handleResetPasswordSubmit = async () => {
    setActionError("");
    setSuccessMsg("");
    if (!resetModal.password) {
      setActionError("Password cannot be empty.");
      return;
    }
    try {
      await webApi.post("/auth/users/reset-password", {
        staff_code: resetModal.staff_code,
        new_password: resetModal.password
      });
      setSuccessMsg(`Password for user ${resetModal.staff_code} reset successfully.`);
      setResetModal({ show: false, staff_code: "", password: "" });
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to reset password.");
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setSuccessMsg("");
    if (!addUserForm.staff_code) return;
    try {
      const res = await webApi.post("/auth/add-user", {
        staff_code: addUserForm.staff_code,
        role: addUserForm.role
      });
      setSuccessMsg(`User added successfully! Default password: ${res.data.default_password}`);
      setShowAddUserModal(false);
      setAddUserForm({ staff_code: "", role: "user" });
      fetchUsers();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to add user.");
    }
  };

  // Filter users
  const filteredUsers = users.filter(
    (u) =>
      u.staff_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.division.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const managerCount = users.filter(u => u.role === "manager").length;
  const activeCount = users.filter(u => u.status === "active").length;

  const isAdmin = currentUser?.role === "admin";

  return (
    <PageContainer
      title="User Directory & Credentials Console"
      description="View, register, and modify employee credentials, access levels, and security profiles mapped to the VMDash environment."
      actions={
        isAdmin && (
          <button 
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-md"
          >
            <UserPlus size={16} /> Add User Role
          </button>
        )
      }
    >
      {/* Success/Error Banners */}
      {successMsg && (
        <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-800 dark:text-emerald-400 flex items-center justify-between shadow-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-800 dark:text-emerald-400 hover:opacity-85 font-bold ml-4">✕</button>
        </div>
      )}
      {actionError && (
        <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-800 dark:text-rose-400 flex items-center justify-between shadow-sm">
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="text-rose-800 dark:text-rose-400 hover:opacity-85 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Users</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalCount}</div>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Admins</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{adminCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Managers</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{managerCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white/70 dark:bg-slate-900/70">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
            <Shield size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Users</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{activeCount}</div>
          </div>
        </Card>
      </div>

      {/* Main Table view */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Registered Portal Profiles</h3>
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none max-w-[200px]" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-10 text-sm text-slate-400">Loading user directory...</div>
          ) : error ? (
            <div className="text-center py-10 text-sm text-rose-500">{error}</div>
          ) : (
            <table className="w-full border-collapse text-left text-xs bg-white dark:bg-slate-900/40">
              <thead className="bg-slate-50/50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Staff Code</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3">Last Active</th>
                  {isAdmin && <th className="px-4 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-350">
                {filteredUsers.map((u) => (
                  <tr key={u.staff_code} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3.5 font-bold font-mono text-slate-800 dark:text-slate-200">{u.staff_code}</td>
                    <td className="px-4 py-3.5 font-semibold">{u.name}</td>
                    <td className="px-4 py-3.5">{u.entity}</td>
                    <td className="px-4 py-3.5">{u.division}</td>
                    <td className="px-4 py-3.5">{getRoleBadge(u.role)}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={u.status === "active" ? "success" : "default"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400 dark:text-slate-500">{u.created_at || "—"}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-400 dark:text-slate-500">{u.last_login_at || "—"}</td>
                    {isAdmin && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setRoleModal({ show: true, staff_code: u.staff_code, role: u.role })}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition" 
                            title="Modify Permissions"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => setResetModal({ show: true, staff_code: u.staff_code, password: "" })}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition" 
                            title="Reset Password"
                          >
                            <Key size={13} />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(u.staff_code)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition" 
                            title={u.status === "active" ? "Deactivate User" : "Activate User"}
                          >
                            {u.status === "active" ? <ToggleRight size={13} className="text-emerald-500" /> : <ToggleLeft size={13} className="text-slate-400" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Edit Role Modal */}
      {roleModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Change User Role</h3>
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500">Updating role for <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{roleModal.staff_code}</span></p>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition"
                value={roleModal.role}
                onChange={(e) => setRoleModal({ ...roleModal, role: e.target.value })}
              >
                <option value="user" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">User</option>
                <option value="manager" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Manager</option>
                <option value="admin" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Administrator</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRoleModal({ show: false, staff_code: "", role: "" })}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChangeSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Reset User Password</h3>
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500">Specify new password for <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{resetModal.staff_code}</span></p>
              <input
                type="password"
                placeholder="Enter new secure password..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition"
                value={resetModal.password}
                onChange={(e) => setResetModal({ ...resetModal, password: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setResetModal({ show: false, staff_code: "", password: "" })}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPasswordSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleAddUserSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Add User Role</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VS10106"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition"
                  value={addUserForm.staff_code}
                  onChange={(e) => setAddUserForm({ ...addUserForm, staff_code: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Role</label>
                <select
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 transition"
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                >
                  <option value="user" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">User</option>
                  <option value="manager" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Manager</option>
                  <option value="admin" className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ show: false, title: "", message: "", onConfirm: null })}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
