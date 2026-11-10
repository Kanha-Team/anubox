"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { showToast } from "@/lib/toast";
import { copyToClipboard, formatBytes, getFileExt, getMediaType } from "@/lib/utils";

interface AdminFileItem {
  id: string;
  url: string;
  filename: string;
  size: number;
  media_type: string;
  uploaded_on: string;
  ip?: string;
  chunks_count: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [files, setFiles] = useState<AdminFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media?limit=100");
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin");
        return;
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      showToast("Could Not Load Files", "err");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  async function handleDelete(ids: string[]) {
    if (!ids.length) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} file(s)?`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/delete-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Deleted ${data.deleted?.length || ids.length} file(s)`, "ok");
        setSelected((prev) => prev.filter((id) => !ids.includes(id)));
        setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
      } else {
        throw new Error(data.error || "Failed to delete");
      }
    } catch (err: any) {
      showToast(err.message || "Could Not Delete Files", "err");
    } finally {
      setDeleting(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filtered = files.filter(
    (f) =>
      f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <>
      <Nav active="/admin">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          title="Sign Out"
        >
          <Icon name="logout" />
          <span className="hide-sm">Sign Out</span>
        </button>
      </Nav>

      <main id="main">
        <header className="legal-hero">
          <div className="wrap rise">
            <span className="kicker">Administration</span>
            <h1>Admin Dashboard</h1>
            <p>Manage, Search And Delete Uploaded Files Stored On AnuBox.</p>
            <div className="legal-meta">
              <span>{files.length} Total Files</span>
              <span>{formatBytes(totalSize)} Total Storage</span>
            </div>
          </div>
        </header>

        <div className="wrap" style={{ marginTop: 32, marginBottom: 64 }}>
          {/* SEARCH & ACTIONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div style={{ flex: 1, minWidth: 260, maxWidth: 440 }}>
              <input
                type="text"
                className="input"
                placeholder="Search by filename or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {selected.length > 0 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(selected)}
                  disabled={deleting}
                >
                  <Icon name="trash" /> Delete Selected ({selected.length})
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={fetchFiles}
              >
                <Icon name="refresh" /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <span className="spin" style={{ width: 32, height: 32 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="status-empty-box">
              <Icon name="history" />
              <p>No uploaded files found.</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={
                          selected.length > 0 &&
                          selected.length === filtered.length
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? filtered.map((f) => f.id) : []
                          )
                        }
                      />
                    </th>
                    <th>Preview</th>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>IP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const isImg = getMediaType(getFileExt(f.filename)) === "image";
                    return (
                      <tr key={f.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(f.id)}
                            onChange={() => toggleSelect(f.id)}
                          />
                        </td>
                        <td style={{ width: 64 }}>
                          {isImg ? (
                            <img
                              src={f.url}
                              alt=""
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: 6,
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--bg-sub)",
                                borderRadius: 6,
                              }}
                            >
                              <Icon name="file" />
                            </div>
                          )}
                        </td>
                        <td>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontWeight: 600, color: "var(--fg)" }}
                          >
                            {f.filename}
                          </a>
                          <div style={{ fontSize: 12, color: "var(--fg-dim)", fontFamily: "monospace" }}>
                            {f.id}
                          </div>
                        </td>
                        <td>{formatBytes(f.size)}</td>
                        <td style={{ fontSize: 13 }}>
                          {new Date(f.uploaded_on).toLocaleString()}
                        </td>
                        <td style={{ fontSize: 12, fontFamily: "monospace" }}>
                          {f.ip || "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-icon btn-sm btn-ghost"
                              title="Copy Link"
                              onClick={() => copyToClipboard(f.url, "Link Copied")}
                            >
                              <Icon name="copy" />
                            </button>
                            <a
                              className="btn btn-icon btn-sm btn-ghost"
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open"
                            >
                              <Icon name="external" />
                            </a>
                            <button
                              type="button"
                              className="btn btn-icon btn-sm btn-ghost"
                              title="Delete"
                              onClick={() => handleDelete([f.id])}
                              style={{ color: "var(--err)" }}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
