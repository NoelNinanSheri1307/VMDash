import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import webApi from "../api/webapi";

const AddUser = () => {
  const navigate = useNavigate();
  const [staffCode, setStaffCode] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!staffCode.trim()) {
      setError("Staff code is required");
      return;
    }

    if (!role) {
      setError("Please select a user role");
      return;
    }

    setLoading(true);
    try {
      const response = await webApi.post("/auth/add-user", {
        staff_code: staffCode,
        role: role,
      });

      setSuccess(`User ${staffCode} created successfully with default password!`);
      setStaffCode("");
      setRole("view_only");

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#0B1220] dark:to-[#0d1627] text-slate-800 dark:text-slate-100 px-6 py-8 flex flex-col items-center">
      <h1 className="w-full max-w-2xl text-center text-slate-800 dark:text-white font-bold text-3xl md:text-[32px] tracking-tight mb-7">
        Add New User
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 mb-8 shadow-md transition hover:shadow-lg text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5 pb-2 border-b-2 border-blue-600 dark:border-blue-500">
            <svg
              className="w-6 h-6 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>User Details</span>
          </div>

          {error && (
            <div className="bg-[#fb473d] text-white text-center px-4 py-3 rounded-[10px] mb-4 border border-[#fecaca]">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-[#44bb44] text-white px-3 py-3 rounded-lg mb-5 text-center font-medium">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-2 text-sm">Staff Code</label>
              <input
                type="text"
                placeholder="Staff Code"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-slate-850 text-slate-850 dark:text-white transition focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-2 text-sm">User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-slate-800 text-sm bg-white dark:bg-slate-850 text-slate-850 dark:text-white transition focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                required
              >
                <option value="" disabled>
                  Select user role
                </option>
                <option value="admin">Admin</option>
                <option value="view_only">View Only</option>
              </select>
            </div>
          </div>

          <div className="text-[16px] text-slate-700 dark:text-slate-300 mt-6 mb-2 text-center font-medium">
            Default password: <strong>vssc@isro{staffCode}</strong>
          </div>

          <div className="flex justify-end mt-2 mb-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-blue-600 dark:text-blue-400 text-sm font-semibold bg-transparent border-none cursor-pointer hover:underline"
            >
              Back
            </button>
          </div>

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-48 py-[13px] text-[17px] font-bold text-white rounded-[12px] bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-[0_8px_18px_rgba(99,102,241,0.25)] dark:shadow-[0_8px_24px_rgba(99,102,241,0.4)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-80"
            >
              {loading ? "CREATING USER..." : "CREATE USER"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddUser;
