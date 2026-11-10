import { showToast } from "./toast";

export function formatBytes(bytes: number): string {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${i === 0 ? val : val.toFixed(val >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "";
  if (sec < 60) return `${Math.max(1, Math.round(sec))}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export async function copyToClipboard(
  text: string,
  successMsg: string = "Copied To Clipboard"
): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      if (!ok) throw new Error("copy failed");
    }
    showToast(successMsg, "ok");
    return true;
  } catch (err) {
    showToast("Could Not Copy. Please Copy It By Hand.", "err");
    return false;
  }
}

export function getFileExt(filename: string): string {
  const clean = String(filename).split("?")[0].split("/").pop() || "";
  const idx = clean.lastIndexOf(".");
  return idx > -1 ? clean.slice(idx + 1).toLowerCase() : "";
}

const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "avif"];
const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"];
const audioExts = ["mp3", "wav", "ogg", "m4a", "flac"];

export function getMediaType(ext: string): "image" | "video" | "audio" | "file" {
  const e = ext.toLowerCase();
  if (imageExts.includes(e)) return "image";
  if (videoExts.includes(e)) return "video";
  if (audioExts.includes(e)) return "audio";
  return "file";
}

export function formatCodeLink(kind: string, url: string, name?: string): string {
  const title = name || String(url).split("?")[0].split("/").pop() || "File";
  const isImg = getMediaType(getFileExt(url)) === "image";
  switch (kind) {
    case "markdown":
      return isImg ? `![${title}](${url})` : `[${title}](${url})`;
    case "html":
      return isImg ? `<img src="${url}" alt="${title}">` : `<a href="${url}">${title}</a>`;
    case "bbcode":
      return isImg ? `[img]${url}[/img]` : `[url=${url}]${title}[/url]`;
    default:
      return url;
  }
}

export function formatSpeed(bytesPerSec: number): { bytes: string; bits: string } {
  const mbps = (bytesPerSec * 8) / 1_000_000;
  return {
    bytes: `${formatBytes(bytesPerSec)}/s`,
    bits: `${mbps >= 10 ? Math.round(mbps) : mbps.toFixed(1)} Mbps`,
  };
}

export function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export async function hashFile(file: File): Promise<string> {
  if (file.size <= 0x2000000) {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return toHex(digest);
  }
  return hashString(`${file.name}|${file.size}|${file.lastModified}`);
}
