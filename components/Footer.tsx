"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  const handleCreatorsClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      const el = document.getElementById("creators");
      if (el) {
        e.preventDefault();
        window.history.replaceState(null, "", "/#creators");
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <span className="foot-brand">
          <img src="/assets/img/icon.png" alt="" width="24" height="24" />
          <span suppressHydrationWarning>
            © {new Date().getFullYear()} AnuBox File Hosting. Your Files Stay Encrypted.
          </span>
        </span>
        <nav className="foot-links" aria-label="Footer">
          <Link href="/">Upload</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/status">Status</Link>
          <Link href="/#creators" onClick={handleCreatorsClick}>
            Creators
          </Link>
          <Link href="/admin">Admin Dash</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
