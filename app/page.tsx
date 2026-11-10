"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { CodeBlock, CodeItem } from "@/components/CodeBlock";
import { Drawer } from "@/components/Modal";
import QRModal from "@/components/QRModal";
import { showToast } from "@/lib/toast";
import {
  copyToClipboard,
  formatBytes,
  formatDuration,
  formatSpeed,
  getFileExt,
  getMediaType,
  hashFile,
  hashString,
} from "@/lib/utils";
import { creators, specialThanks, githubProfile } from "@/lib/creators";

const HISTORY_KEY = "anubox_uploads";

interface HistoryItem {
  url: string;
  name: string;
  hash: string;
  time: string;
}

function getStoredHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      raw = localStorage.getItem("anya_uploads") || localStorage.getItem("chiku_uploads");
      if (raw) localStorage.setItem(HISTORY_KEY, raw);
    }
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {}
}

function addToHistory(url: string, name: string, hash: string) {
  const current = getStoredHistory().filter((i) => i.hash !== hash);
  current.push({
    url,
    name,
    hash,
    time: new Date().toLocaleString(),
  });
  saveStoredHistory(current.slice(-60));
}

const fileTypeIcon = (filename: string) => {
  const type = getMediaType(getFileExt(filename));
  if (type === "audio") return "music";
  return type;
};

interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  total?: number;
  pct: number;
  exact?: number;
  sent?: number;
  speed?: number;
  eta?: number | null;
  elapsed?: number;
  status: "wait" | "check" | "up" | "done" | "dup" | "err";
  error?: string;
  note?: string;
  preview?: string | null;
  processing?: boolean;
}

function ProgressRing({ pct, waiting }: { pct: number; waiting?: boolean }) {
  const circ = 2 * Math.PI * 22;
  return (
    <div className={`ring${waiting ? " wait" : ""}`}>
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle className="ring-bg" cx="26" cy="26" r="22" />
        <circle
          className="ring-fg"
          cx="26"
          cy="26"
          r="22"
          transform="rotate(-90 26 26)"
          strokeDasharray={circ}
          strokeDashoffset={waiting ? 0.72 * circ : circ * (1 - pct / 100)}
        />
      </svg>
      <b>
        {waiting ? (
          <span className="spin" />
        ) : (
          <>
            {pct}
            <small>%</small>
          </>
        )}
      </b>
    </div>
  );
}

function QueueRow({ it }: { it: QueueItem }) {
  const isUploading = it.status === "up";
  const speed = formatSpeed(it.speed || 0);
  const statusLabels: Record<string, string> = {
    wait: "Waiting",
    check: "Checking",
    dup: "Already Uploaded",
    done: "Done",
  };
  const statusText =
    it.status === "err" ? it.error || "Failed" : statusLabels[it.status];

  const metaText = isUploading
    ? `${formatBytes(it.size)} · ${
        it.processing
          ? "Saving Your File"
          : `Uploading ${(it.exact || 0).toFixed(1)}%`
      }`
    : `${formatBytes(it.size)}${it.note ? `, ${it.note}` : ""}`;

  return (
    <li className={`q-row ${it.status}`}>
      <div className="q-thumb">
        {it.preview ? (
          <img src={it.preview} alt="" />
        ) : (
          <Icon name={fileTypeIcon(it.name)} />
        )}
      </div>
      <div className="q-main">
        <div className="q-name" title={it.name}>
          {it.name}
        </div>
        <div className="q-meta">{metaText}</div>
        {isUploading && (
          <>
            <div
              className={`q-bar${it.processing ? " wait" : ""}`}
              role="progressbar"
              aria-label={`Uploading ${it.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={it.processing ? undefined : it.pct}
            >
              <i
                style={{
                  width: it.processing ? "100%" : `${it.exact || 0}%`,
                }}
              />
            </div>
            <dl className="q-stats">
              <div>
                <dt>Speed</dt>
                <dd>
                  {(it.speed || 0) > 0 ? (
                    <>
                      {speed.bytes} <small>{speed.bits}</small>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Uploaded</dt>
                <dd>
                  {formatBytes(it.sent || 0)}{" "}
                  <small>of {formatBytes(it.size)}</small>
                </dd>
              </div>
              <div>
                <dt>Time Left</dt>
                <dd>
                  {it.processing
                    ? "Almost Done"
                    : Number.isFinite(it.eta) && (it.eta || 0) > 0
                    ? formatDuration(it.eta || 0)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Elapsed</dt>
                <dd>{formatDuration(it.elapsed || 0)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
      <div className="q-state">
        {isUploading && (
          <ProgressRing pct={it.pct || 0} waiting={it.processing} />
        )}
        {(it.status === "done" || it.status === "dup") && (
          <Icon name="checkCircle" className="draw" />
        )}
        {it.status === "err" && <Icon name="alert" />}
        {it.status === "check" && <span className="spin" />}
        {!isUploading && <span>{statusText}</span>}
      </div>
    </li>
  );
}

function LinkIconThumbnail({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const isImage = getMediaType(getFileExt(url)) === "image";

  return (
    <span className="link-ico">
      {isImage && !loaded && <span className="sk" />}
      {isImage && (
        <img
          src={url}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
            setLoaded(true);
          }}
        />
      )}
      <Icon name={fileTypeIcon(url)} />
    </span>
  );
}

function CopyButton({
  text,
  label,
  okMsg,
}: {
  text: string;
  label: string;
  okMsg: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const ok = await copyToClipboard(text, okMsg);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-icon btn-sm btn-ghost${copied ? " copy-ok" : ""}`}
      title={label}
      aria-label={label}
      onClick={handleClick}
    >
      <Icon name={copied ? "check" : "copy"} />
    </button>
  );
}

const STEPS: [string, string, string][] = [
  [
    "1",
    "Add Your Files",
    "Drag Them Onto The Page, Paste From Your Clipboard, Or Import From A Public Link.",
  ],
  [
    "2",
    "We Lock And Store Them",
    "Each File Is Split Up, Encrypted And Saved On Telegram. Only Encrypted Bytes Ever Leave Our Server.",
  ],
  [
    "3",
    "Share The Link",
    "Copy The Direct Link And Share It Anywhere. Scan The Qr Code To Open It On Your Phone.",
  ],
];

const FEATURES: [string, string][] = [
  [
    "Links That Stay",
    "Every File Gets A Stable Address Ending In Its Extension, So It Is Safe To Embed Or Hot-Link.",
  ],
  [
    "Big Files Welcome",
    "Upload Up To 100 Mb. Files Travel In Small Pieces, So Slow Connections Still Finish.",
  ],
  [
    "Quick To Open",
    "Cached Delivery And Range Requests Mean Video And Audio Start Playing And Seeking Right Away.",
  ],
  [
    "Safe By Default",
    "Pages, Scripts And Svg Files Always Download Instead Of Running In The Browser.",
  ],
  [
    "Import From A Link",
    "Paste The Address Of A File And We Fetch It For You, With Checks That Block Private Networks.",
  ],
];

const FILE_KINDS = [
  "Photos",
  "Videos",
  "Music",
  "Documents",
  "Archives",
  "Anything Else",
];

const FAQ_ITEMS: [string, string][] = [
  [
    "Do I Need An Account?",
    "No. Open The Page, Drop A File And Copy The Link. There Is Nothing To Sign Up For.",
  ],
  [
    "How Long Do My Links Last?",
    "Links Are Permanent. Once A File Is Uploaded, Its Address Keeps Working.",
  ],
  [
    "Can Other People Read My Files?",
    "Only Someone Who Has The Link Can Open A File. What We Store Is Encrypted, So The Stored Data Is Unreadable On Its Own.",
  ],
  [
    "What Is The Size Limit?",
    "Each File Can Be Up To The Limit Shown In The Box Above. Larger Files Are Uploaded In Small Pieces So They Still Finish On Slow Connections.",
  ],
  [
    "Can I Upload From My Own Code?",
    "Yes. Send One Multipart Request And Get Json Back With The Link. The Api Docs Have Examples For CURL, Javascript And Python.",
  ],
];

export default function HomePage() {
  const [results, setResults] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sourceTab, setSourceTab] = useState<"files" | "url">("files");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[] | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [maxSize, setMaxSize] = useState<number | null>(null);
  const [modKey, setModKey] = useState("Ctrl");
  const [origin, setOrigin] = useState("https://anubox.vercel.app");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  const maxSizeRef = useRef(100);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const logoArtRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    if (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "")) {
      setModKey("⌘");
    }
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.maxSizeMB) {
          setMaxSize(data.maxSizeMB);
          maxSizeRef.current = data.maxSizeMB;
        }
      })
      .catch(() => setMaxSize(100));
  }, []);

  const addResult = (url: string) =>
    setResults((prev) => (prev.includes(url) ? prev : [...prev, url]));

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  // Upload single file chunk-by-chunk
  async function uploadFileItem(item: QueueItem) {
    const file = item.file;
    updateQueueItem(item.id, { status: "check" });

    const hash = await hashFile(file);
    const existing = getStoredHistory().find((i) => i.hash === hash);
    if (existing) {
      addResult(existing.url);
      updateQueueItem(item.id, { status: "dup" });
      return;
    }

    updateQueueItem(item.id, {
      status: "up",
      pct: 0,
      exact: 0,
      sent: 0,
      speed: 0,
      eta: null,
      elapsed: 0,
      processing: false,
    });

    const uploadId = (
      crypto.randomUUID
        ? crypto.randomUUID()
        : String(Math.random()).slice(2) + Date.now()
    ).replace(/-/g, "");

    const CHUNK_SIZE = 4_000_000;
    const numChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;
    const chunkProgress = Array(numChunks).fill(0);
    const chunkRecords: any[] = [];
    const startTime = Date.now();
    const speedHistory: { t: number; sent: number }[] = [];
    let smoothedSpeed = 0;

    const computeProgress = () => {
      const sent = Math.min(
        file.size,
        chunkProgress.reduce((a, b) => a + b, 0)
      );
      const now = Date.now();
      speedHistory.push({ t: now, sent });
      while (speedHistory.length > 2 && now - speedHistory[0].t > 3000) {
        speedHistory.shift();
      }
      const oldest = speedHistory[0];
      const deltaSec = (now - oldest.t) / 1000;
      if (deltaSec >= 0.4) {
        const curSpeed = Math.max(0, (sent - oldest.sent) / deltaSec);
        smoothedSpeed = smoothedSpeed
          ? 0.6 * smoothedSpeed + 0.4 * curSpeed
          : curSpeed;
      }
      const isDone = sent >= file.size;
      updateQueueItem(item.id, {
        pct: Math.min(100, Math.floor((sent / file.size) * 100)),
        exact: Math.min(100, (sent / file.size) * 100),
        sent,
        total: file.size,
        speed: isDone ? 0 : smoothedSpeed,
        eta: !isDone && smoothedSpeed > 0 ? (file.size - sent) / smoothedSpeed : null,
        elapsed: (now - startTime) / 1000,
        processing: isDone,
      });
    };

    // Upload chunks in order
    for (let i = 0; i < numChunks; i++) {
      if (cancelledRef.current) throw new Error("Upload Cancelled");
      const slice = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

      const record = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload/chunk");
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.setRequestHeader("x-upload-id", uploadId);
        xhr.setRequestHeader("x-chunk-index", String(i));
        xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            chunkProgress[i] = e.loaded;
            computeProgress();
          }
        };

        xhr.onerror = () =>
          reject(new Error("Network Error. Check Your Connection."));
        xhr.onabort = () => reject(new Error("Upload Cancelled"));

        xhr.onload = () => {
          let res: any = {};
          try {
            res = JSON.parse(xhr.responseText);
          } catch {}
          if (xhr.status >= 200 && xhr.status < 300 && !res.error) {
            resolve(res);
          } else {
            reject(new Error(res.error || `Server Error ${xhr.status}`));
          }
        };

        if (abortCtrlRef.current?.signal) {
          abortCtrlRef.current.signal.addEventListener("abort", () => xhr.abort(), {
            once: true,
          });
        }

        xhr.send(slice);
      });

      chunkRecords.push(record);
      chunkProgress[i] = slice.size;
      computeProgress();
    }

    // Complete upload
    const completeRes = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        name: file.name,
        type: file.type,
        chunks: chunkRecords,
      }),
      signal: abortCtrlRef.current?.signal,
    });

    const completeJson = await completeRes.json();
    if (!completeRes.ok || completeJson.error) {
      throw new Error(completeJson.error || `Server Error ${completeRes.status}`);
    }

    const finalUrl = completeJson.url || completeJson.data;
    addResult(finalUrl);
    addToHistory(finalUrl, completeJson.filename || file.name, hash);
    updateQueueItem(item.id, {
      status: "done",
      pct: 100,
      processing: false,
    });
  }

  const handleFiles = useCallback(async (filesList: FileList | File[]) => {
    const list = Array.from(filesList || []);
    if (!list.length) return;
    if (isUploadingRef.current) {
      showToast("Please Wait, An Upload Is Still Running", "warn");
      return;
    }
    const totalBytes = list.reduce((a, b) => a + b.size, 0);
    if (totalBytes > 300 * 1024 * 1024) {
      showToast("Please Upload Less Than 300 Mb At A Time", "err");
      return;
    }

    const maxBytes = maxSizeRef.current * 1024 * 1024;
    const newItems: QueueItem[] = list.map((file, idx) => {
      const over = file.size > maxBytes;
      return {
        id: `${Date.now()}-${idx}`,
        file,
        name: file.name,
        size: file.size,
        pct: 0,
        status: over ? "err" : "wait",
        error: over ? `Over ${maxSizeRef.current} Mb` : "",
        preview:
          file.type.startsWith("image/") && file.size < 12 * 1024 * 1024
            ? URL.createObjectURL(file)
            : null,
      };
    });

    setQueue(newItems);
    abortCtrlRef.current = new AbortController();
    cancelledRef.current = false;
    isUploadingRef.current = true;
    setUploading(true);

    let successes = 0;
    let failures = 0;

    for (const item of newItems) {
      if (item.status === "err") {
        failures++;
        showToast(`${item.name} Is Over The Size Limit`, "err");
        continue;
      }
      if (cancelledRef.current) {
        updateQueueItem(item.id, { status: "err", error: "Cancelled" });
        failures++;
        continue;
      }
      try {
        await uploadFileItem(item);
        successes++;
      } catch (err: any) {
        updateQueueItem(item.id, {
          status: "err",
          error: err.message || "Failed",
        });
        failures++;
      }
    }

    isUploadingRef.current = false;
    setUploading(false);
    newItems.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (cancelledRef.current) {
      showToast("Upload Cancelled", "info");
    } else if (successes && !failures) {
      showToast(
        successes === 1 ? "Your File Is Ready" : `${successes} Files Are Ready`,
        "ok"
      );
    } else if (successes && failures) {
      showToast(
        `${successes} Uploaded, ${failures} Did Not Finish`,
        "warn"
      );
    } else if (failures) {
      showToast("The Upload Did Not Finish", "err");
    }
  }, []);

  // URL Import
  async function handleUrlImport() {
    const raw = urlInput.trim();
    if (!raw) {
      showToast("Paste A Link First", "warn");
      return;
    }
    try {
      new URL(raw);
    } catch {
      showToast("That Does Not Look Like A Valid Link", "err");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`/api/hosturl?url=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server Error ${res.status}`);
      }
      const finalUrl = data.url || data.data;
      addResult(finalUrl);
      addToHistory(
        finalUrl,
        data.filename || raw.split("/").pop() || "remote-file",
        await hashString(raw)
      );
      showToast("Imported. Your Link Is Ready", "ok");
      setUrlInput("");
    } catch (err: any) {
      showToast(err.message || "Could Not Import That Link", "err");
    } finally {
      setImporting(false);
    }
  }

  // Paste Listener
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length) {
        setSourceTab("files");
        handleFiles(files);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  // Global Drag and Drop
  useEffect(() => {
    let count = 0;
    const isFiles = (e: DragEvent) =>
      Boolean(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files"));

    const onEnter = (e: DragEvent) => {
      if (isFiles(e)) {
        e.preventDefault();
        count++;
        setDragging(true);
      }
    };
    const onOver = (e: DragEvent) => {
      if (isFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (isFiles(e)) {
        count = Math.max(0, count - 1);
        if (count === 0) setDragging(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      if (isFiles(e)) {
        e.preventDefault();
        count = 0;
        setDragging(false);
        setSourceTab("files");
        if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFiles]);

  const openFilePicker = () => fileInputRef.current?.click();
  const completedCount = queue.filter(
    (i) => i.status === "done" || i.status === "dup" || i.status === "err"
  ).length;

  const totalProgress = queue.length
    ? Math.round(
        queue.reduce((acc, it) => {
          return (
            acc +
            (it.status === "up"
              ? it.exact ?? it.pct
              : it.status !== "wait" && it.status !== "check"
              ? 100
              : 0)
          );
        }, 0) / queue.length
      )
    : 0;

  const totalSpeed = queue.reduce(
    (acc, it) => acc + (it.status === "up" ? it.speed || 0 : 0),
    0
  );

  const displayLimit = maxSize || 100;

  const devCodeSnippets: CodeItem[] = [
    {
      label: "cURL",
      lang: "bash",
      code: `curl -X POST ${origin}/upload \\\n  -F "file=@photo.jpg"`,
    },
    {
      label: "JavaScript",
      lang: "js",
      code: `const form = new FormData();\nform.append('file', file);\n\nconst res = await fetch('${origin}/upload', {\n  method: 'POST',\n  body: form,\n});\nconsole.log((await res.json()).url);`,
    },
    {
      label: "Python",
      lang: "py",
      code: `import requests\n\nwith open('photo.jpg', 'rb') as f:\n    r = requests.post('${origin}/upload', files={'file': f})\n\nprint(r.json()['url'])`,
    },
  ];

  const devResponseSnippets: CodeItem[] = [
    {
      label: "Response 200",
      lang: "json",
      code: `{\n  "url": "${origin}/1753020712833.jpg",\n  "filename": "photo.jpg",\n  "size": 83638,\n  "media_type": "image/jpeg"\n}`,
    },
  ];

  return (
    <>
      <Nav active="/">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setHistoryList(null);
            setHistoryOpen(true);
            setTimeout(() => setHistoryList(getStoredHistory().slice().reverse()), 250);
          }}
          title="Upload History"
          aria-label="Upload History"
        >
          <Icon name="history" />
          <span className="hide-sm">History</span>
        </button>
      </Nav>

      <main id="main">
        {/* HERO */}
        <section className="hero">
          <div className="wrap">
            <div className="hero-top">
              <div className="hero-copy rise">
                <span className="badge">Encrypted Before It Is Stored</span>
                <h1>
                  Upload Once.
                  <br />
                  Share The Link Forever.
                </h1>
                <p className="lede">
                  Drop In A Photo, Video, Song Or Document And Get A Direct Link Back In Seconds. No Account, No Ads, And Every File Is Encrypted Before It Is Saved.
                </p>
                <div className="hero-cta">
                  <a
                    className="btn btn-primary"
                    href="#upload"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("upload")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                  >
                    Start Uploading
                  </a>
                  <Link className="btn" href="/docs">
                    Api Docs
                  </Link>
                </div>
                <ul className="hero-points">
                  <li>No Sign Up</li>
                  <li>Up To {displayLimit} Mb Per File</li>
                  <li>Permanent Links</li>
                </ul>
              </div>
              <div className="hero-art" aria-hidden="true">
                <img
                  ref={logoArtRef}
                  src="/assets/img/logo.png"
                  alt=""
                  width="420"
                  height="420"
                  fetchPriority="high"
                />
              </div>
            </div>

            {/* UPLOADER */}
            <div className="uploader rise" id="upload">
              <div className="up-head">
                <div className="tabs" role="tablist" aria-label="Upload Source">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sourceTab === "files"}
                    className={sourceTab === "files" ? "on" : ""}
                    onClick={() => setSourceTab("files")}
                  >
                    <Icon name="upload" /> Files
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sourceTab === "url"}
                    className={sourceTab === "url" ? "on" : ""}
                    onClick={() => setSourceTab("url")}
                  >
                    <Icon name="link" /> From A Link
                  </button>
                </div>
              </div>

              <div className="up-body">
                {sourceTab === "files" ? (
                  <div
                    className={`dz${dragging ? " over" : ""}${uploading ? " busy" : ""}`}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest("button, a")) {
                        openFilePicker();
                      }
                    }}
                  >
                    <div className="dz-icon" aria-hidden="true">
                      <Icon name="cloudUp" />
                    </div>
                    <h2>Drop Your Files Here</h2>
                    <p>Or Pick Them From Your Device. Up To {displayLimit} Mb Each.</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openFilePicker}
                    >
                      <Icon name="upload" /> Choose Files
                    </button>
                    <p className="dz-hint hide-sm">
                      You Can Also Paste With <kbd>{modKey}</kbd> <kbd>V</kbd>
                    </p>
                    <p className="dz-terms">
                      By Uploading You Agree To Our{" "}
                      <Link href="/terms">Terms & Conditions</Link>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      hidden
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                  </div>
                ) : (
                  <div className="url-box">
                    <label htmlFor="urlInput">Link To A Public File</label>
                    <div className="url-row">
                      <input
                        id="urlInput"
                        className="input"
                        type="url"
                        inputMode="url"
                        placeholder="https://example.com/photo.jpg"
                        value={urlInput}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUrlImport();
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleUrlImport}
                        disabled={importing}
                      >
                        {importing ? (
                          <>
                            <span className="spin" /> Importing
                          </>
                        ) : (
                          <>
                            <Icon name="download" /> Import
                          </>
                        )}
                      </button>
                    </div>
                    <p className="field-hint">
                      We Download The File On Our Server And Host It For You. Up To {displayLimit} Mb.
                    </p>
                  </div>
                )}

                {/* QUEUE */}
                {queue.length > 0 && (
                  <div className="queue">
                    <div className="queue-head">
                      <span>{uploading ? "Uploading Now" : "Upload Queue"}</span>
                      {uploading && totalSpeed > 0 && (
                        <span className="live-speed">
                          <Icon name="zap" /> {formatSpeed(totalSpeed).bytes}{" "}
                          <small>{formatSpeed(totalSpeed).bits}</small>
                        </span>
                      )}
                      <span className="mono">
                        {completedCount} Of {queue.length}
                      </span>
                      {uploading && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            cancelledRef.current = true;
                            abortCtrlRef.current?.abort();
                          }}
                        >
                          <Icon name="x" /> Cancel
                        </button>
                      )}
                    </div>
                    {queue.length > 1 && (
                      <div className="q-total" aria-hidden="true">
                        <i style={{ width: `${totalProgress}%` }} />
                      </div>
                    )}
                    <ul>
                      {queue.map((it) => (
                        <QueueRow key={it.id} it={it} />
                      ))}
                    </ul>
                  </div>
                )}

                {/* RESULTS */}
                {results.length > 0 && (
                  <div className="results">
                    <div className="results-head">
                      <h3>
                        Your Links <span className="count">{results.length}</span>
                      </h3>
                      <div className="results-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            copyToClipboard(
                              results.join("\n"),
                              results.length > 1 ? "Links Copied" : "Link Copied"
                            )
                          }
                        >
                          <Icon name="copy" /> Copy All
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setResults([]);
                            setQueue([]);
                          }}
                        >
                          <Icon name="trash" /> Clear
                        </button>
                      </div>
                    </div>
                    <ul className="link-list">
                      {results.map((url) => (
                        <li key={url} className="link-row">
                          <LinkIconThumbnail url={url} />
                          <a
                            className="mono link-url"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {url}
                          </a>
                          <div className="link-actions">
                            <CopyButton
                              text={url}
                              label="Copy Link"
                              okMsg="Link Copied"
                            />
                            <button
                              type="button"
                              className="btn btn-icon btn-sm btn-ghost"
                              title="Qr Code"
                              aria-label="Show Qr Code"
                              onClick={() => setQrUrl(url)}
                            >
                              <Icon name="qr" />
                            </button>
                            <a
                              className="btn btn-icon btn-sm btn-ghost"
                              title="Open In A New Tab"
                              aria-label="Open In A New Tab"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Icon name="external" />
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* SPECS */}
            <dl className="specs">
              <div>
                <dt>Largest File</dt>
                <dd>{displayLimit} Mb</dd>
              </div>
              <div>
                <dt>Encryption</dt>
                <dd>Always On</dd>
              </div>
              <div>
                <dt>Link Lifetime</dt>
                <dd>Permanent</dd>
              </div>
              <div>
                <dt>Sign Up</dt>
                <dd>Not Needed</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* KINDS */}
        <section className="section" aria-labelledby="kinds-h">
          <div className="wrap">
            <div className="kinds">
              <h2 id="kinds-h">Host Whatever You Need To Share</h2>
              <ul>
                {FILE_KINDS.map((kind) => (
                  <li key={kind}>{kind}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* THREE STEPS */}
        <section className="section" aria-labelledby="how-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="how-h">From File To Link In Three Steps</h2>
              <p>No Setup And No Waiting Around. Most Uploads Finish Before You Have Switched Tabs.</p>
            </div>
            <ol className="steps">
              {STEPS.map(([num, title, desc]) => (
                <li key={num}>
                  <span className="step-n">{num}</span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" aria-labelledby="feat-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="feat-h">Simple To Use, Careful With Your Files</h2>
              <p>Everything You Need To Host Files For A Website, A Chat Or A Script, And Nothing You Do Not.</p>
            </div>
            <div className="feat-grid">
              <article className="feat lead">
                <h3>Encrypted Before It Is Stored</h3>
                <p>
                  Telegram Only Ever Receives Scrambled Data With A Random File Name. When Someone Opens Your Link, We Unlock The Pieces On The Fly And Send Back The Real File.
                </p>
                <ol className="flow">
                  <li>
                    <b>Your File</b>
                    <small>Photo, Video, Anything</small>
                  </li>
                  <li>
                    <b>Encrypted Pieces</b>
                    <small>Locked On Our Server</small>
                  </li>
                  <li>
                    <b>Cloud Storage</b>
                    <small>Unreadable Without The Key</small>
                  </li>
                </ol>
              </article>
              {FEATURES.map(([title, desc]) => (
                <article key={title} className="feat">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* DEVELOPERS */}
        <section className="section" aria-labelledby="api-h">
          <div className="wrap dev">
            <div className="dev-copy">
              <span className="kicker">For Developers</span>
              <h2 id="api-h">One Request, One Link</h2>
              <p>
                Send A File, Get Json Back. No Keys, No Sdk And No Dashboard To Set Up. Use It From A Script, A Ci Job Or Your Own App.
              </p>
              <ul className="ticks">
                <li>Plain Multipart Upload, Plus Chunked Uploads For Big Files</li>
                <li>Import From A Link With A Single Get Request</li>
                <li>Clear Json Responses And Readable Error Messages</li>
              </ul>
              <Link className="btn" href="/docs">
                Read The Api Docs
              </Link>
            </div>
            <div className="dev-code">
              <CodeBlock items={devCodeSnippets} />
              <CodeBlock items={devResponseSnippets} compact />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" aria-labelledby="faq-h">
          <div className="wrap faq">
            <div className="faq-head">
              <h2 id="faq-h">Questions People Ask</h2>
              <p>
                Short Answers. For Anything Technical, The{" "}
                <Link href="/docs">Api Docs</Link> Go Deeper.
              </p>
            </div>
            <div className="faq-list">
              {FAQ_ITEMS.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" aria-labelledby="cta-h">
          <div className="wrap">
            <div className="cta">
              <img src="/assets/img/icon.png" alt="" width="72" height="72" />
              <div>
                <h2 id="cta-h">Got A File? Get A Link.</h2>
                <p>It Takes A Few Seconds And You Do Not Need An Account.</p>
              </div>
              <a
                className="btn btn-primary"
                href="#upload"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("upload")?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }}
              >
                Upload A File
              </a>
            </div>
          </div>
        </section>

        {/* CREATORS */}
        <section className="section" id="creators" aria-labelledby="creators-h">
          <div className="wrap">
            <div className="sec-head center">
              <span className="kicker">The Team</span>
              <h2 id="creators-h">Creators</h2>
              <p>
                The People Who Built And Run AnuBox File Hosting. Questions, Reports And Ideas Are Welcome On Github.
              </p>
            </div>
            <div className="creators">
              {creators.map((c) => (
                <article key={c.key} className="creator">
                  <div className="creator-banner" aria-hidden="true" />
                  <div className="avatar">
                    <img
                      className="avatar-img"
                      src={c.img}
                      alt={`${c.plain}, Creator`}
                      width="160"
                      height="160"
                      loading="lazy"
                    />
                  </div>
                  <span className="creator-role">Creator</span>
                  <h3 className="creator-name" aria-label={c.plain}>
                    <span aria-hidden="true">{c.name}</span>
                  </h3>
                  <a
                    className="btn btn-primary gh-btn"
                    href={githubProfile(c.handle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${c.handle} On Github`}
                  >
                    <Icon name="github" /> {c.handle} <Icon name="external" />
                  </a>
                  {c.socials?.length > 0 && (
                    <ul className="creator-socials" aria-label={`${c.plain} Links`}>
                      {c.socials.map((s) => (
                        <li key={s.label}>
                          <a
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${c.plain} On ${s.label}`}
                          >
                            <span className="soc-ico">
                              <Icon name={s.icon} />
                            </span>
                            <span className="soc-name">{s.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
            {specialThanks.length > 0 && (
              <div className="thanks">
                <p className="thanks-title">
                  Special Thanks To {specialThanks.map((s) => s.name).join(" & ")} For Helping Me With This Project.
                </p>
                <ul className="thanks-links">
                  {specialThanks.map((s) => (
                    <li key={s.handle}>
                      <a
                        href={githubProfile(s.handle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${s.name} On Github`}
                      >
                        <Icon name="github" /> {s.handle}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* DRAG OVERLAY */}
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <span className="drop-ico">
              <Icon name="cloudUp" />
            </span>
            <strong>Drop To Upload</strong>
            <span>Let Go Anywhere On The Page</span>
          </div>
        </div>
      )}

      {/* HISTORY DRAWER */}
      {historyOpen && (
        <Drawer
          onClose={() => setHistoryOpen(false)}
          title="Upload History"
          icon="history"
          footer={
            historyList && historyList.length > 0 ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  saveStoredHistory([]);
                  setHistoryList([]);
                  showToast("History Cleared", "info");
                }}
              >
                <Icon name="trash" /> Clear History
              </button>
            ) : null
          }
        >
          {historyList === null ? (
            <div aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="hist-sk">
                  <span className="sk" style={{ width: 20, height: 20 }} />
                  <span>
                    <span className="sk" style={{ width: "65%", height: 13 }} />
                    <span className="sk" style={{ width: "40%", height: 10 }} />
                  </span>
                </div>
              ))}
            </div>
          ) : historyList.length === 0 ? (
            <div className="empty">
              <Icon name="history" />
              <h3>Nothing Here Yet</h3>
              <p>Files You Upload From This Browser Will Show Up Here.</p>
            </div>
          ) : (
            <ul className="hist">
              {historyList.map((item, idx) => (
                <li key={item.hash + idx}>
                  <button
                    type="button"
                    className="h-main"
                    onClick={() => {
                      addResult(item.url);
                      setHistoryOpen(false);
                      showToast("Loaded From History", "info");
                    }}
                  >
                    <Icon name={fileTypeIcon(item.name)} />
                    <span>
                      <b>{item.name}</b>
                      <small>{item.time}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon btn-sm btn-ghost"
                    title="Copy Link"
                    aria-label={`Copy Link To ${item.name}`}
                    onClick={() => copyToClipboard(item.url, "Link Copied")}
                  >
                    <Icon name="copy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Drawer>
      )}

      {/* QR MODAL */}
      {qrUrl && <QRModal url={qrUrl} onClose={() => setQrUrl(null)} />}
    </>
  );
}
