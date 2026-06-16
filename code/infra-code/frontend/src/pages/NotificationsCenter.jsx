import React, { useState, useEffect } from "react";
import PageContainer from "../layouts/PageContainer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Bell, BellRing, Mail, Check, Trash2, CheckSquare } from "lucide-react";
import proxmoxApi from "../api/proxmoxapi";

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await proxmoxApi.get("/proxmox/notifications");
      setNotifications(res.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await proxmoxApi.put(`/proxmox/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await proxmoxApi.put("/proxmox/notifications/read-all");
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "critical":
        return "border-rose-500 bg-rose-500/5 dark:bg-rose-950/10";
      case "warning":
        return "border-amber-500 bg-amber-500/5 dark:bg-amber-950/10";
      default:
        return "border-blue-500 bg-blue-500/5 dark:bg-blue-950/10";
    }
  };

  return (
    <PageContainer
      title="Notification Center"
      description="View real-time environment events, request status approvals, alerts, and system notifications."
      actions={
        notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition"
          >
            <CheckSquare size={14} /> Mark All Read
          </button>
        )
      }
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400">Loading notifications...</div>
        ) : error ? (
          <div className="text-center py-12 text-sm text-rose-500">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex flex-col items-center justify-center gap-3">
            <Mail size={36} className="text-slate-350" />
            <p className="text-sm">You're all caught up! No notifications received.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 border-l-4 ${getSeverityStyle(n.severity)} border-y-slate-250/20 border-r-slate-250/20 dark:border-y-slate-800/50 dark:border-r-slate-800/50 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden transition hover:shadow-md flex items-start justify-between gap-4`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-1.5 h-1.5 rounded-full ${n.is_read ? "bg-slate-300" : "bg-blue-600"}`} />
                  <h4 className={`text-sm font-bold ${n.is_read ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                    {n.title}
                  </h4>
                  <Badge variant={n.severity === "critical" ? "danger" : n.severity === "warning" ? "warning" : "default"}>
                    {n.severity}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {n.message}
                </p>
                <div className="text-[10px] text-slate-400 font-mono mt-2">
                  Received: {n.created_at}
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-lg transition"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
