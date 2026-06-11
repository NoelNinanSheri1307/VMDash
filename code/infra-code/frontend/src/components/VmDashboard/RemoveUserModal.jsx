import React, { useEffect, useState } from "react";
import proxmoxApi from "../../api/proxmoxapi";

const RemoveUserModal = ({ vm, onClose, onRemoved }) => {
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(false);

    // Fetch users when modal opens
    useEffect(() => {
        if (!vm?.vm_uuid) return;

        proxmoxApi.get(`/proxmox/vms/${vm.vm_uuid}/users`)
        .then((res) => { setUsers(res.data || []); })
        .catch((err) => { console.error("Failed to fetch VM users", err); });
    }, [vm]);

    const toggleUser = (staffCode) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(staffCode) ? next.delete(staffCode) : next.add(staffCode);
            return next;
        });
    };

    const handleRemove = () => {
        if (selected.size === 0) return;

        setLoading(true);

        proxmoxApi.post(`/proxmox/vms/${vm.vm_uuid}/removeUsers`, {
            staff_codes: Array.from(selected),
        })
        .then(() => {
            setLoading(false);
            onClose();
            if (onRemoved) onRemoved();
        })
        .catch((err) => {
            setLoading(false);
            console.error("Failed to remove users", err);
        });
    };


    return (
        <div className = "fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
            <div className = "bg-white p-6 rounded shadow-lg w-[900px] max-h-[90vh] overflow-auto">
                <h2 className = "text-xl font-semibold mb-4">
                    Remove Users from {vm?.vm_name}
                </h2>

                {/* Header */}
                <div className = "grid grid-cols-6 gap-2 text-xs font-semibold text-gray-600 mb-2 px-2">
                    <div></div>
                    <div>Staff Code</div>
                    <div>Name</div>
                    <div>Entity</div>
                    <div>Group</div>
                    <div>Division</div>
                </div>

                {/* User rows */}
                {users.length === 0 && (
                    <div className = "text-gray-500 text-sm mb-4">
                        No users mapped to this VM.
                    </div>
                )}

                {users.map((user) => (
                    <div key = {user.staff_code} className = "grid grid-cols-6 gap-2 items-center border rounded mb-2 p-2 text-sm">
                        <input type = "checkbox" checked = {selected.has(user.staff_code)} onChange = {() => toggleUser(user.staff_code)}/>
                        <div>{user.staff_code}</div>
                        <div className = "truncate">{user.name}</div>
                        <div>{user.entity}</div>
                        <div>{user.group}</div>
                        <div>{user.division}</div>
                    </div>
                ))}

                {/* Actions */}
                <div className = "flex justify-end gap-3 mt-6">
                    <button className = "px-4 py-2 bg-gray-300 rounded" onClick = {onClose} disabled = {loading}>Cancel</button>
                    <button className = {`px-4 py-2 rounded text-white ${
                        selected.size === 0 || loading ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                        }`}
                        disabled = {selected.size === 0 || loading}
                        onClick = {handleRemove}
                    >
                        {loading ? "Removing..." : "Remove Selected Users"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemoveUserModal;