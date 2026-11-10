import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  saveChunk,
  getDb,
  saveDb,
  FileRecord,
  ChunkRecord,
  checkAdminAuth,
} from "@/lib/storage";
import { getFileExt } from "@/lib/utils";

function isPrivateIp(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.")
  ) {
    return true;
  }
  const match172 = hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\./);
  if (match172) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_AUTH === "true" && !checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

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

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    if (isPrivateIp(parsed.hostname)) {
      return NextResponse.json(
        { error: "Cannot Fetch From Private Or Internal Networks" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "That Does Not Look Like A Valid Link" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "AnuBox-File-Hosting/4.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to download file from URL (HTTP ${res.status})` },
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
    const origin = req.nextUrl.origin || "https://anubox.vercel.app";
    const fileUrl = `${origin}/${fileKey}`;

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const record: FileRecord = {
      id: fileKey,
      filename: originalName,
      size: fileBuffer.length,
      media_type: contentType,
      uploaded_on: new Date().toISOString(),
      ip: clientIp,
      chunks: savedChunks,
    };

    const db = getDb();
    db.unshift(record);
    saveDb(db);

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
