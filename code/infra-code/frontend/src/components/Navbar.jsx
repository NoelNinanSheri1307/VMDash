import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
    const location = useLocation();

    const linkClasses = (path) =>
        `px-3 py-2 rounded hover:bg-blue-600 hover:text-white transition ${
            location.pathname === path ? "bg-blue-600 text-white" : "text-gray-800"
        }`;

    return (
        <nav className = "bg-gray-100 border-b shadow-sm mb-6">
            <div className = "max-w-7xl mx-auto px-4 py-3 flex items-center space-x-4">
                
                <Link to = "/" className = "text-xl font-bold text-blue-700">Infra Management</Link>

                <div className = "flex items-center space-x-2 ml-6">
                    <Link className = {linkClasses("/")} to = "/">Home</Link>
                    <Link className = {linkClasses("/add")} to = "/add">Add VM</Link>
                    <Link className = {linkClasses("/proxmox/vms")} to = "/proxmox/vms">Proxmox VMs</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;