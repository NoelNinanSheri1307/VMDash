import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import webApi from "../api/webapi";
import bg from '../assets/bg4.png';

const Login = () => {
  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already logged in - redirect away from login page
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const res = await webApi.get("/auth/check");
        if (res.data) {
          // User is already logged in, redirect to main page
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        // Not logged in, stay on login page
      } finally {
        setCheckingAuth(false);
      }
    };
    checkExistingAuth();
  }, [navigate]);

  // If arriving with ?reset=1, open reset mode
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldReset = params.get("reset") === "1";
    if (shouldReset) {
      setIsResetMode(true);
      setError("");
      setPassword("");
    }
  }, [location.search]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center overflow-hidden font-sans relative">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover bg-no-repeat"
          style={{ backgroundImage: `url(${bg})` }}
        />
        <div className="bg-white/70 backdrop-blur-md rounded-2xl px-10 py-10 shadow-lg border border-white/30">
          Checking...
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isResetMode) {
      // Reset Password Logic
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match. Try again.");
        setLoading(false);
        return;
      }

      try {
        await webApi.post("/auth/reset-password", {
          staff_code: staffCode,
          new_password: newPassword,
          confirm_password: confirmPassword,
        });

        alert("Password reset successful!");
        setIsResetMode(false);
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        setError(err.response?.data?.error || "Password reset failed");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const response = await webApi.post("/auth/login", {
          staff_code: staffCode,
          password: password,
        });

        localStorage.setItem("user", JSON.stringify(response.data));
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || "Login failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    setIsResetMode(true);
    setError("");
    setPassword("");
  };

  const handleBackToLogin = () => {
    setIsResetMode(false);
    setError("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden font-sans relative">
      <div
        className="absolute inset-0 -z-10 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${bg})` }}
      />

      <div className="absolute top-1/2 left-[5%] -translate-y-1/2 flex flex-col items-center justify-center px-10 py-10 max-w-[550px] w-[40%] min-w-[450px]">
        <h1 className="w-full text-center text-[#1f2a56] text-[42px] font-extrabold tracking-[1px] uppercase whitespace-nowrap mb-[15px]">
          {isResetMode ? "RESET PASSWORD" : "LOGIN"}
        </h1>

        <p className="text-[#4b5563] text-[18px] font-semibold mb-7">
          Infrastructure Visualization System
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          {error && (
            <div className="bg-[#fb473d] text-white text-center px-[14px] py-3 rounded-[10px] mb-4 border border-[#fecaca]">
              {error}
            </div>
          )}

          {/* Staff Code Input */}
          <div className="flex items-center mb-[18px] bg-white/80 rounded-xl px-[10px] py-[6px] border border-[#914af6] shadow-sm w-full min-w-[400px]">
            <div className="w-11 h-11 bg-[#4459c9] rounded-xl flex items-center justify-center mr-3 shrink-0 text-white shadow-[0_8px_18px_rgba(68,89,201,0.35)]">
              <svg
                className="w-[22px] h-[22px]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <input
              type="text"
              placeholder="Staff Code"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              required
              className="flex-1 border-none bg-transparent px-[10px] py-[14px] text-[18px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />
          </div>

          {/* Password/New Password Input */}
          <div className="flex items-center mb-[18px] bg-white/80 rounded-xl px-[10px] py-[6px] border border-[#914af6] shadow-sm w-full min-w-[400px]">
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
              placeholder={isResetMode ? "New Password" : "Password"}
              value={isResetMode ? newPassword : password}
              onChange={(e) =>
                isResetMode ? setNewPassword(e.target.value) : setPassword(e.target.value)
              }
              required
              className="flex-1 border-none bg-transparent px-[10px] py-[14px] text-[18px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />
          </div>

          {/* Confirm Password Input (only in reset mode) */}
          {isResetMode && (
            <div className="flex items-center mb-[18px] bg-white/80 rounded-xl px-[10px] py-[6px] border border-[#914af6] shadow-sm w-full min-w-[400px]">
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
                className="flex-1 border-none bg-transparent px-[10px] py-[14px] text-[18px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
              />
            </div>
          )}

          {/* Forgot Password / Back to Login */}
          <div className="flex justify-end mt-2 mb-[18px]">
            {!isResetMode ? (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[#4459c9] text-sm font-semibold bg-transparent border-none cursor-pointer hover:underline"
              >
                Forgot Password?
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-[#4459c9] text-sm font-semibold bg-transparent border-none cursor-pointer hover:underline"
              >
                Back to Login
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-[18px] text-[19px] font-bold text-white rounded-[14px]
                       bg-gradient-to-br from-[#1bb34b] to-[#0f8639]
                       shadow-[0_12px_28px_rgba(16,185,129,0.35)]
                       transition-transform duration-100 ease-out
                       hover:-translate-y-[1px]
                       hover:shadow-[0_16px_32px_rgba(16,185,129,0.45)]
                       disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading
              ? isResetMode
                ? "RESETTING..."
                : "LOGGING IN..."
              : isResetMode
              ? "SUBMIT"
              : "LOGIN"}
          </button>
        </form>
      </div>

      <div className="hidden" aria-hidden="true" />
    </div>
  );
};

export default Login;
