"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const THEME_KEY = "anubox_theme";
const THEMES = ["system", "light", "dark"] as const;
type ThemeMode = (typeof THEMES)[number];

const THEME_LABELS: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const THEME_ICONS: Record<ThemeMode, string> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    try {
      const stored = (localStorage.getItem(THEME_KEY) ||
        localStorage.getItem("anya_theme")) as ThemeMode;
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      setTheme("system");
    }
  }, []);

  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  const toggleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    const root = document.documentElement;
    if (next === "light" || next === "dark") {
      root.setAttribute("data-theme", next);
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      if (next === "system") {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, next);
      }
    } catch {}
  };

  return (
    <button
      type="button"
      className="btn btn-icon btn-ghost"
      onClick={toggleTheme}
      title={`Theme: ${THEME_LABELS[theme]}`}
      aria-label={`Theme: ${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[nextTheme]}.`}
    >
      <Icon name={THEME_ICONS[theme]} />
    </button>
  );
}

export function Brand({ sub }: { sub?: string }) {
  return (
    <Link className="brand" href="/" aria-label="AnuBox || File Hosting Home">
      <img src="/assets/img/icon.jpg" width="34" height="34" alt="" />
      <span className="brand-name">AnuBox || File Hosting</span>
      {sub && <span className="brand-tag">{sub}</span>}
    </Link>
  );
}

const NAV_ITEMS: [string, string, string][] = [
  ["/", "Upload", "upload"],
  ["/docs", "API Docs", "book"],
  ["/status", "Status", "zap"],
  ["/#creators", "Creators", "users"],
  ["/admin", "Admin Dash", "shield"],
];

const findElement = (idOrClass: string) =>
  document.getElementById(idOrClass) ||
  document.querySelector("." + idOrClass);

function handleNavClick(
  e: React.MouseEvent,
  href: string,
  pathname: string,
  onClose?: () => void
) {
  if (onClose) onClose();
  if (!href.startsWith("/#") || pathname !== "/") return;
  const target = findElement(href.slice(2));
  if (target) {
    e.preventDefault();
    window.history.replaceState(null, "", href);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export interface NavProps {
  active?: string;
  sub?: string;
  children?: React.ReactNode;
}

export function Nav({ active, sub, children }: NavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/" || !window.location.hash) return;
    const t = setTimeout(() => {
      const el = findElement(window.location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 761px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Brand sub={sub} />
        <nav className="nav-links" aria-label="Primary">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={active === href ? "on" : ""}
              aria-current={active === href ? "page" : undefined}
              onClick={(e) => handleNavClick(e, href, pathname)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-tools">
          {children}
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-icon btn-ghost menu-btn"
            aria-expanded={open}
            aria-controls="nav-sheet"
            aria-label={open ? "Close Menu" : "Open Menu"}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </div>
      {open && (
        <nav id="nav-sheet" className="nav-sheet" aria-label="Mobile">
          {NAV_ITEMS.map(([href, label, iconName]) => (
            <Link
              key={href}
              href={href}
              className={active === href ? "on" : ""}
              onClick={(e) => handleNavClick(e, href, pathname, () => setOpen(false))}
            >
              <Icon name={iconName} /> {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export default Nav;
