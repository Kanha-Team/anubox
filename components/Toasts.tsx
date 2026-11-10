"use client";

import React, { useEffect, useState } from "react";
import { subscribeToasts, ToastMessage, ToastType } from "@/lib/toast";
import { Icon } from "@/components/Icon";

const iconMap: Record<ToastType, string> = {
  ok: "checkCircle",
  err: "alert",
  warn: "alert",
  info: "info",
};

export default function Toasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts((item) => {
      setToasts((prev) => [...prev, item].slice(-4));
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, out: true } : t))
        );
      }, 3600);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 3900);
    });
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, out: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  };

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type}${t.out ? " out" : ""}`}
        >
          <Icon name={iconMap[t.type] || "info"} />
          <span>{t.msg}</span>
          <button
            type="button"
            className="toast-x"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss Notification"
          >
            <Icon name="x" />
          </button>
        </div>
      ))}
    </div>
  );
}
