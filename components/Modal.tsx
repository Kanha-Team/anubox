"use client";

import React, { useEffect, useRef } from "react";
import { Icon } from "./Icon";

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  onClose?: () => void
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getTabbable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((node) => node.getClientRects().length > 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (closeRef.current) closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getTabbable();
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    const initial =
      el.querySelector<HTMLElement>("[data-autofocus]") ||
      getTabbable()[0] ||
      el;
    initial.focus({ preventScroll: true });

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (prevActive && prevActive.focus) {
        prevActive.focus({ preventScroll: true });
      }
    };
  }, [containerRef]);
}

export interface ModalProps {
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
}

export function Modal({ onClose, title, width, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);

  return (
    <div className="overlay center" role="presentation">
      <div className="overlay-bg" onClick={onClose} />
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={width ? { maxWidth: width } : undefined}
      >
        <button
          type="button"
          className="btn btn-icon btn-ghost modal-x"
          onClick={onClose}
          aria-label="Close Dialog"
        >
          <Icon name="x" />
        </button>
        {children}
      </div>
    </div>
  );
}

export interface DrawerProps {
  onClose: () => void;
  title: string;
  icon?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Drawer({ onClose, title, icon, footer, children }: DrawerProps) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, onClose);

  return (
    <div className="overlay end" role="presentation">
      <div className="overlay-bg" onClick={onClose} />
      <aside
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="drawer-head">
          <h2>
            {icon && <Icon name={icon} />}
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close Panel"
          >
            <Icon name="x" />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
