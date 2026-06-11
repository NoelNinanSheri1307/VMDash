import React from "react";

const UserList = ({ users }) => {
    if (!users || users.length === 0) return null;

    return (
        <div className = "border border-slate-200 dark:border-slate-800 rounded-[14px] p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className = "font-semibold text-slate-800 dark:text-slate-200 mb-3">Users Assigned</h3>

            <ul className = "text-sm text-slate-600 dark:text-slate-400 space-y-2">
                {users.map((u, idx) => (
                    <li key = {idx} className = "border-b border-slate-100 dark:border-slate-800 py-2 last:border-none">
                        <b className="text-slate-800 dark:text-slate-200">{u.staff_code}</b> - <span className="font-medium">{u.name}</span><br />
                        <span className="text-xs text-slate-500 dark:text-slate-500">Entity: {u.entity} | Group: {u.group} | Division: {u.division}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserList;