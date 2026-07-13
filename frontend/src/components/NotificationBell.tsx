"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import AppSheet from "@/components/AppSheet";
import { fmtDateTime } from "@/lib/format";

type Notification = {
  id: string;
  title: string;
  body?: string;
  kind?: string;
  read?: boolean;
  created_at?: string;
};

export default function NotificationBell({ testid = "notification-bell" }: { testid?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch {
      // inbox optional if API unavailable
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [load]);

  async function markRead(id: string) {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid={testid}
        onClick={() => { setOpen(true); load(); }}
        className="relative min-h-[44px] min-w-[44px] rounded-full hover:bg-brand-surface inline-flex items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <AppSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        size="md"
        footer={
          unread > 0 ? (
            <button type="button" data-testid="notifications-read-all" onClick={markAll} className="pill-btn btn-outline w-full h-11">
              Mark all read
            </button>
          ) : null
        }
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-brand-border -mx-1">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  data-testid={`notification-${n.id}`}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-2 py-3 hover:bg-brand-surface transition-colors ${n.read ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read ? <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" /> : <span className="w-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{n.title}</div>
                      {n.body ? <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div> : null}
                      {n.created_at ? <div className="text-[11px] text-muted-foreground mt-1">{fmtDateTime(n.created_at)}</div> : null}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AppSheet>
    </>
  );
}
