import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import webApi from "../api/webapi";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const [auth_user, setAuthUser] = useState(null); //auth_user -> authenticated user info
    const [status, setStatus] = useState(true); // status -> true: checking auth, false: checked
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await webApi.get("/auth/check");
                setAuthUser(res.data);
            } catch (err) {
                setAuthUser(null);
            } finally {
                setStatus(false);// Finished checking authentication
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                await webApi.get("/auth/check");
            } catch (err) {
                // Session expired, clear storage and redirect to login
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("/login");
            }
        }, 60000); // Check every 60 seconds

        return () => clearInterval(interval);
    }, []);

    if (status) {
        return <div className="flex justify-center items-center h-screen text-slate-600 dark:text-slate-400">Checking authentication...</div>;
    }

    if (!auth_user) {
        return <Navigate to="/login" replace />;
    }

    // Dynamic role mapping: admin/view_only -> admin, manager, user
    let role = auth_user.role;
    if (role === "view_only") {
        if (auth_user.staff_code === "manager") {
            role = "manager";
        } else {
            role = "user";
        }
    }

    // Role verification
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;