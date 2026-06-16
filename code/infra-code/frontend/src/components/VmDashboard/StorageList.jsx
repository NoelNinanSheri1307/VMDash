import React from "react";

const StorageList = ({ storages }) => {
    if (!storages || storages.length === 0) {
        return (
            <div className = "border border-slate-200 dark:border-slate-800 rounded-[14px] p-4 bg-white dark:bg-slate-900 shadow-sm">
                <div className = "text-slate-500 dark:text-slate-400 text-sm">No storage information available.</div>
            </div>
        );
    }

    return (
        <div className = "border border-slate-200 dark:border-slate-800 rounded-[14px] p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className = "font-semibold text-slate-800 dark:text-slate-200 mb-3">Storage Devices</h3>

            <div className = "space-y-3">
                {storages.map((s, index) => (
                    <div key = {index} className = "border border-slate-100 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/30 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-950/60 transition">
                        <div className = "font-semibold text-slate-800 dark:text-slate-200 mb-1">{s.disk_image}</div>

                        <div className = "grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div>
                                <span className = "font-medium text-slate-400 dark:text-slate-500">Storage:</span> <span className="font-mono text-xs">{s.storage_name}</span>
                            </div>
                            <div>
                                <span className="block">
                                    <span className="font-medium text-slate-400 dark:text-slate-500">Size:</span> <span className="font-mono text-xs">{s.size}</span>
                                </span>
                            </div>
                            <div>
                                <span className = "font-medium text-slate-400 dark:text-slate-500">Status:</span>{" "}
                                <span className = {`px-2 py-0.5 rounded text-white text-xs font-semibold ${
                                    s.live_status === "active" ? "bg-green-600 dark:bg-green-700" : "bg-slate-500 dark:bg-slate-600"
                                }`}
                                >
                                    {s.live_status || "unknown"}
                                </span>
                            </div>
                            {s.initial_storage_entry_time && (
                                <div className = "col-span-2 text-xs">
                                    <span className = "font-medium text-slate-400 dark:text-slate-500">Initial:</span> {s.initial_storage_entry_time }
                                </div>
                            )}
                            {s.updated_storage_entry_time && (
                                <div className = "col-span-2 text-xs">
                                    <span className = "font-medium text-slate-400 dark:text-slate-500">Updated:</span> {s.updated_storage_entry_time}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StorageList;