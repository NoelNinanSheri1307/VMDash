import React, { useState, useEffect } from "react";
import bg5 from '../assets/bg5.png';
import { useNavigate } from "react-router-dom";
import webApi from "../api/webapi";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const staffCode = user?.staff_code;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Try again.");
      return;
    }

    setLoading(true);
    try {
      await webApi.post("/auth/change-password", {
        staff_code: staffCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      alert("Password changed successfully!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  // Prevent scrolling on mount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center overflow-hidden font-sans relative" style={{overflow: 'hidden'}}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.3)); }
          50% { filter: drop-shadow(0 0 40px rgba(59, 130, 246, 0.7)); }
        }
        .floating-lock {
          animation: float 6s ease-in-out infinite, pulse-glow 4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="absolute inset-0 -z-10 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${bg5})` }}
      />

      {/* Glassmorphic Form Card */}
      <div className="absolute top-[50%] left-[10%] -translate-y-1/2 flex flex-col items-center justify-center px-10 py-10 max-w-[550px] w-[40%] min-w-[450px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 rounded-3xl shadow-2xl">
        <h1 className="w-full text-center text-slate-900 dark:text-white text-[38px] font-extrabold tracking-[1px] uppercase whitespace-nowrap mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
          CHANGE PASSWORD
        </h1>

        <form onSubmit={handleSubmit} className="w-full">
          {error && (
            <div className="bg-[#fb473d] text-white text-center px-[14px] py-3 rounded-[10px] mb-4 border border-[#fecaca]">
              {error}
            </div>
          )}

          <div className="flex items-center mb-[18px] bg-white/90 dark:bg-slate-850/90 rounded-xl px-[10px] py-[6px] border border-blue-500/50 dark:border-blue-500/30 shadow-sm w-full">
            <div className="w-11 h-11 bg-[#4459c9] rounded-xl flex items-center justify-center mr-3 shrink-0 text-white shadow-[0_8px_18px_rgba(68,89,201,0.35)]">
              <svg
                className="w-[22px] h-[22px]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="flex-1 border-none bg-transparent px-[10px] py-[14px] text-[18px] text-slate-850 dark:text-white outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center mb-[18px] bg-white/90 dark:bg-slate-850/90 rounded-xl px-[10px] py-[6px] border border-blue-500/50 dark:border-blue-500/30 shadow-sm w-full">
            <div className="w-11 h-11 bg-[#4459c9] rounded-xl flex items-center justify-center mr-3 shrink-0 text-white shadow-[0_8px_18px_rgba(68,89,201,0.35)]">
              <svg
                className="w-[22px] h-[22px]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 1C8.676 1 6 3.676 6 7v3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v3H8V7c0-2.276 1.724-4 4-4zm-1.5 12.5l-2-2 1.414-1.414L11.5 13.672l3.086-3.086L16 11.5l-4.5 4.5z" />
              </svg>
            </div>

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="flex-1 border-none bg-transparent px-[10px] py-[14px] text-[18px] text-slate-850 dark:text-white outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex justify-end mt-2 mb-[18px]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-blue-600 dark:text-blue-400 text-sm font-semibold bg-transparent border-none cursor-pointer hover:underline"
            >
              Back
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[18px] text-[19px] font-bold text-white rounded-[14px]
                       bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                       shadow-[0_12px_28px_rgba(59,130,246,0.3)]
                       transition-transform duration-100 ease-out
                       hover:-translate-y-[1px]
                       hover:shadow-[0_16px_32px_rgba(59,130,246,0.4)]
                       disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>

      {/* Floating Animated Lock Icon on the right */}
      <div className="absolute right-[15%] top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center justify-center pointer-events-none">
        <div className="floating-lock w-64 h-64 text-blue-600/60 dark:text-blue-400/60">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
            <defs>
              <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2"/>
              </linearGradient>
            </defs>
            <path d="M7 10V7a5 5 0 0 1 10 0v3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            <rect x="3" y="10" width="18" height="11" rx="3" strokeLinecap="round" strokeLinejoin="round" fill="url(#lockGrad)" />
            <path d="M12 14v3" strokeLinecap="round" strokeWidth="1.5" />
            <circle cx="12" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;

