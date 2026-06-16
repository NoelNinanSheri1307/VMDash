import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import webApi from "../api/webapi";
import isroLogo from "../assets/isrologo.svg";
import ParticleBackground from "../components/ParticleBackground";

const Login = () => {
  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Typewriter sub-header phrases
  const typewriterPhrases = [
    "Virtual Machine Operations Center",
    "Infrastructure Monitoring & Analytics",
    "Resource Governance Platform",
    "Hypervisor Management Interface"
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [subText, setSubText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    const currentPhrase = typewriterPhrases[phraseIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setSubText(currentPhrase.substring(0, subText.length - 1));
      }, 10); // backspace speed (faster for smoother feel)
    } else {
      timer = setTimeout(() => {
        setSubText(currentPhrase.substring(0, subText.length + 1));
      }, 25); // typing speed (faster for smoother feel)
    }

    if (!isDeleting && subText === currentPhrase) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 3000); // pause at full text
    } else if (isDeleting && subText === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % typewriterPhrases.length);
    }

    return () => clearTimeout(timer);
  }, [subText, isDeleting, phraseIndex]);

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
      <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "sans-serif", position: "relative", backgroundColor: "#000" }}>
        <ParticleBackground />
        <div style={{ position: "relative", zIndex: 10, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "40px", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
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

        setSuccessMsg("Password reset successful! You can now log in.");
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
    setSuccessMsg("");
    setPassword("");
  };

  const handleBackToLogin = () => {
    setIsResetMode(false);
    setError("");
    setSuccessMsg("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "sans-serif", position: "relative", backgroundColor: "#000" }}>
      
      {/* Lightweight Canvas Particle Background */}
      <ParticleBackground />

      {/* Glassmorphic Login Card */}
      <div style={{ position: "absolute", top: "50%", left: "5%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", maxWidth: "550px", width: "40%", minWidth: "450px", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset", zIndex: 10 }}>
        
        {/* VSSC ISRO Logo Header */}
        <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <img src={isroLogo} alt="VSSC ISRO Logo" style={{ height: "64px", width: "auto", marginBottom: "12px" }} />
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center", fontFamily: "sans-serif" }}>
            Vikram Sarabhai Space Centre
          </div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center", marginTop: "2px" }}>
            Indian Space Research Organisation
          </div>
        </div>

        <h1 style={{ width: "100%", textAlign: "center", color: "rgba(255,255,255,0.95)", fontSize: "26px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap", marginBottom: "4px" }}>
          {isResetMode ? "RESET PASSWORD" : "PORTAL LOGIN"}
        </h1>

        {/* Typewriter sub-header animation */}
        <div style={{ height: "24px", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.04em", textAlign: "center", margin: 0 }}>
            {subText}
            <span style={{ fontWeight: 700, color: "#38bdf8", marginLeft: "2px", animation: "pulse 1s infinite" }}>|</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          {successMsg && (
            <div style={{ background: "rgba(16,185,129,0.18)", color: "#a7f3d0", border: "1px solid rgba(16,185,129,0.35)", textAlign: "center", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
              {successMsg}
            </div>
          )}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)", textAlign: "center", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {/* Staff Code Input */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "18px", background: "rgba(255,255,255,0.07)", borderRadius: "12px", padding: "6px 10px", border: "1px solid rgba(255,255,255,0.12)", width: "100%", boxSizing: "border-box" }}>
            <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg,#0e88d3,#38bdf8)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", flexShrink: 0, color: "white", boxShadow: "0 4px 12px rgba(14,136,211,0.3)" }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Staff Code"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              required
              style={{ flex: 1, border: "none", background: "transparent", padding: "10px 6px", fontSize: "16px", color: "rgba(255,255,255,0.9)", outline: "none" }}
            />
          </div>

          {/* Password/New Password Input */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "18px", background: "rgba(255,255,255,0.07)", borderRadius: "12px", padding: "6px 10px", border: "1px solid rgba(255,255,255,0.12)", width: "100%", boxSizing: "border-box" }}>
            <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg,#0e88d3,#38bdf8)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", flexShrink: 0, color: "white", boxShadow: "0 4px 12px rgba(14,136,211,0.3)" }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="password"
              placeholder={isResetMode ? "New Password" : "Password"}
              value={isResetMode ? newPassword : password}
              onChange={(e) => isResetMode ? setNewPassword(e.target.value) : setPassword(e.target.value)}
              required
              style={{ flex: 1, border: "none", background: "transparent", padding: "10px 6px", fontSize: "16px", color: "rgba(255,255,255,0.9)", outline: "none" }}
            />
          </div>

          {/* Confirm Password Input (only in reset mode) */}
          {isResetMode && (
            <div style={{ display: "flex", alignItems: "center", marginBottom: "18px", background: "rgba(255,255,255,0.07)", borderRadius: "12px", padding: "6px 10px", border: "1px solid rgba(255,255,255,0.12)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg,#0e88d3,#38bdf8)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", flexShrink: 0, color: "white", boxShadow: "0 4px 12px rgba(14,136,211,0.3)" }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1C8.676 1 6 3.676 6 7v3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v3H8V7c0-2.276 1.724-4 4-4zm-1.5 12.5l-2-2 1.414-1.414L11.5 13.672l3.086-3.086L16 11.5l-4.5 4.5z" />
                </svg>
              </div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ flex: 1, border: "none", background: "transparent", padding: "10px 6px", fontSize: "16px", color: "rgba(255,255,255,0.9)", outline: "none" }}
              />
            </div>
          )}

          {/* Forgot Password / Back to Login */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px", marginBottom: "18px" }}>
            <button
              type="button"
              onClick={isResetMode ? handleBackToLogin : handleForgotPassword}
              style={{ color: "#38bdf8", fontSize: "12px", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.textDecoration = "underline"}
              onMouseLeave={e => e.target.style.textDecoration = "none"}
            >
              {isResetMode ? "Back to Login" : "Forgot Password?"}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", fontSize: "16px", fontWeight: 700, color: "white", borderRadius: "12px", background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 14px rgba(16,185,129,0.3)", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.8 : 1, transition: "all 0.15s ease-out", letterSpacing: "0.05em" }}
            onMouseEnter={e => { if (!loading) { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 20px rgba(16,185,129,0.4)"; } }}
            onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.boxShadow = "0 4px 14px rgba(16,185,129,0.3)"; }}
          >
            {loading ? (isResetMode ? "RESETTING..." : "LOGGING IN...") : (isResetMode ? "SUBMIT" : "LOGIN")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
