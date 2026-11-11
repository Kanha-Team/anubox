"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  const [path, setPath] = useState("");

  useEffect(() => {
    setPath(window.location.pathname + window.location.search);
  }, []);

  return (
    <>
      <Nav />
      <main id="main" className="lost">
        <div className="wrap lost-in rise">
          <img
            className="lost-logo"
            src="/assets/img/logo.jpg"
            alt=""
            width="140"
            height="140"
          />
          <p className="lost-code mono">Error 404</p>
          <h1>We Could Not Find That File</h1>
          <p className="lost-text">
            The Link May Have A Typo, Or The File May Have Been Removed.
          </p>
          {path && (
            <code className="lost-path" title={path}>
              {path}
            </code>
          )}
          <div className="lost-actions">
            <Link className="btn btn-primary" href="/">
              <Icon name="upload" /> Upload A File
            </Link>
            <Link className="btn" href="/docs">
              <Icon name="book" /> Api Docs
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
