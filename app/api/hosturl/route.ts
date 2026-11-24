import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import {
  saveChunk,
  addFileRecord,
  FileRecord,
  ChunkRecord,
  checkAdminAuth,
} from "@/lib/storage";
import { getFileExt, getMimeType, getRequestOrigin } from "@/lib/utils";

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return true; // Malformed IP, block
  }
  const [b0, b1] = parts;
  // 0.0.0.0/8
  if (b0 === 0) return true;
  // 10.0.0.0/8
  if (b0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud metadata e.g. 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16
  if (b0 === 192 && b1 === 168) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const clean = ip.toLowerCase();
  // Loopback / Unspecified
  if (clean === "::" || clean === "::1" || clean === "0:0:0:0:0:0:0:1") return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (clean.startsWith("::ffff:")) {
    const ipv4 = clean.slice(7);
    return isPrivateIpv4(ipv4);
  }
  // Unique local addresses (fc00::/7)
  if (clean.startsWith("fc") || clean.startsWith("fd")) return true;
  // Link-local addresses (fe80::/10)
  if (clean.startsWith("fe8") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb")) return true;
  return false;
}

async function validateUrlForSsrf(rawUrl: string): Promise<{ valid: boolean; error?: string; url?: URL }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: "That Does Not Look Like A Valid Link" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTP and HTTPS links are allowed" };
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname === "localhost") {
    return { valid: false, error: "Cannot Fetch From Private Or Internal Networks" };
  }

  // If hostname is directly an IP literal
  if (net.isIPv4(hostname)) {
    if (isPrivateIpv4(hostname)) {
      return { valid: false, error: "Cannot Fetch From Private Or Internal Networks" };
    }
  } else if (net.isIPv6(hostname)) {
    if (isPrivateIpv6(hostname)) {
      return { valid: false, error: "Cannot Fetch From Private Or Internal Networks" };
    }
  } else {
    // Resolve DNS and check all resolved IP addresses
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return { valid: false, error: "Could not resolve hostname" };
      }
      for (const addr of addresses) {
        if (addr.family === 4 && isPrivateIpv4(addr.address)) {
          return { valid: false, error: "Cannot Fetch From Private Or Internal Networks" };
        }
        if (addr.family === 6 && isPrivateIpv6(addr.address)) {
          return { valid: false, error: "Cannot Fetch From Private Or Internal Networks" };
        }
      }
    } catch {
      return { valid: false, error: "Failed to resolve destination server hostname" };
    }
  }

  return { valid: true, url: parsed };
}

async function handleHostUrl(req: NextRequest, targetUrl: string | null) {
  if (process.env.ENABLE_AUTH === "true" && !checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing URL Parameter" },
      {
        status: 400,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  }

  let currentUrl = targetUrl;
  let parsed: URL;

  // SSRF validation
  const validation = await validateUrlForSsrf(currentUrl);
  if (!validation.valid || !validation.url) {
    return NextResponse.json(
      { error: validation.error || "Invalid or restricted URL" },
      { status: 403 }
    );
  }
  parsed = validation.url;

  try {
    let res: Response | null = null;
    let redirectCount = 0;
    const maxRedirects = 5;

    // Follow redirects manually to validate each redirect target against SSRF
    while (redirectCount < maxRedirects) {
      res = await fetch(currentUrl, {
        headers: {
          "User-Agent": "AnuBox-File-Hosting/4.0",
        },
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        const nextUrl = new URL(loc, currentUrl).toString();
        const nextValidation = await validateUrlForSsrf(nextUrl);
        if (!nextValidation.valid || !nextValidation.url) {
          return NextResponse.json(
            { error: "Redirect destination blocked: " + (nextValidation.error || "Private network") },
            { status: 403 }
          );
        }
        currentUrl = nextUrl;
        parsed = nextValidation.url;
        redirectCount++;
      } else {
        break;
      }
    }

    if (!res || !res.ok) {
      return NextResponse.json(
        { error: `Failed to download file from URL (HTTP ${res?.status || 500})` },
        { status: 400 }
      );
    }

    const arrayBuf = await res.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuf);

    const maxSizeMB = Number(process.env.MAX_SIZE_MB || 100);
    if (fileBuffer.length > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Remote File Exceeds ${maxSizeMB} MB Limit` },
        { status: 413 }
      );
    }

    const urlPathname = parsed.pathname;
    const originalName =
      urlPathname.split("/").filter(Boolean).pop() || "remote-file";
    const ext = getFileExt(originalName) || "bin";
    const contentType =
      res.headers.get("content-type") || "application/octet-stream";

    const CHUNK_SIZE = 4_000_000;
    const numChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE) || 1;
    const uploadId = crypto.randomUUID().replace(/-/g, "");

    const savedChunks: ChunkRecord[] = [];

    for (let i = 0; i < numChunks; i++) {
      const chunkBuf = fileBuffer.subarray(
        i * CHUNK_SIZE,
        Math.min((i + 1) * CHUNK_SIZE, fileBuffer.length)
      );
      const hash = crypto.createHash("sha256").update(chunkBuf).digest("hex");
      const { iv, tag, telegramFileId } = await saveChunk(
        chunkBuf,
        `${uploadId}-${i}`
      );
      savedChunks.push({
        id: `${uploadId}-${i}`,
        index: i,
        size: chunkBuf.length,
        hash,
        telegramFileId,
        iv,
        tag,
      });
    }

    const fileKey = `${Date.now()}.${ext}`;
    const origin = getRequestOrigin(req);
    const fileUrl = `${origin}/${fileKey}`;

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    let mediaType = contentType;
    if (!mediaType || mediaType === "application/octet-stream") {
      mediaType = getMimeType(originalName);
    }

    const record: FileRecord = {
      id: fileKey,
      filename: originalName,
      size: fileBuffer.length,
      media_type: mediaType,
      uploaded_on: new Date().toISOString(),
      ip: clientIp,
      chunks: savedChunks,
    };

    await addFileRecord(record);

    return NextResponse.json(
      {
        data: fileUrl,
        url: fileUrl,
        id: fileKey,
        filename: originalName,
        size: fileBuffer.length,
        uploaded_on: record.uploaded_on,
        media_type: record.media_type,
      },
      {
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to download file from URL" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  return handleHostUrl(req, targetUrl);
}

export async function POST(req: NextRequest) {
  let targetUrl: string | null = null;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      targetUrl = body?.url || null;
    } catch {}
  } else if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    try {
      const formData = await req.formData();
      targetUrl = (formData.get("url") as string) || null;
    } catch {}
  }

  if (!targetUrl) {
    const { searchParams } = new URL(req.url);
    targetUrl = searchParams.get("url");
  }

  return handleHostUrl(req, targetUrl);
}
