import React from "react";

const DetailCard = ({ title, data, expanded }) => {
    if (!expanded) return null;

    if (expanded && !data) {
        return (
            <div className = "border border-slate-200 dark:border-slate-800 rounded-[14px] p-3 shadow-sm bg-white dark:bg-slate-900 text-slate-500">Loading...</div>
        );
    }

    if (!data) return null;

    const entries = Object.entries(data);

    return (
        <div className = "border border-slate-200 dark:border-slate-800 rounded-[14px] p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className = "font-semibold text-slate-800 dark:text-slate-200 mb-3">{title}</h3>

            {entries.length === 0 ? (
                <div className = "text-slate-500 dark:text-slate-400 text-sm">No information available.</div>
            ) : (
                <ul className = "space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    {entries.map(([key, value]) => (
                        <li key = {key} className = "flex justify-between border-b border-slate-100 dark:border-slate-800/60 py-1.5 last:border-none">
                            <span className = "font-medium capitalize text-slate-500 dark:text-slate-500">{key.replace(/_/g, " ")}</span>
                            <span className = "text-right text-slate-800 dark:text-slate-200 font-mono text-xs">{value !== null && value !== undefined ? value.toString() : ""}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DetailCard;