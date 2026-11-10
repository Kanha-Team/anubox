export type ToastType = "ok" | "err" | "warn" | "info";

export interface ToastMessage {
  id: number;
  msg: string;
  type: ToastType;
  out?: boolean;
}

type Listener = (toast: ToastMessage) => void;

let listeners: Listener[] = [];
let nextId = 0;

export function showToast(msg: string, type: ToastType = "info") {
  const toast: ToastMessage = {
    id: ++nextId,
    msg,
    type,
  };
  listeners.forEach((fn) => fn(toast));
}

export function subscribeToasts(fn: Listener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
