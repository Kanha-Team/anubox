import { NextRequest, NextResponse } from "next/server";
import {
  getTempChunk,
  removeTempChunk,
  saveChunk,
  getDb,
  saveDb,
  FileRecord,
  ChunkRecord,
  checkAdminAuth,
} from "@/lib/storage";
import { getFileExt, getRequestOrigin } from "@/lib/utils";

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_AUTH === "true" && !checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON Body" },
      {
        status: 400,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  }

  const { uploadId, name, type, meta, chunks } = body;
  if (!uploadId || !name || !Array.isArray(chunks) || chunks.length === 0) {
    return NextResponse.json(
      { error: "Missing required upload parameters" },
      { status: 400 }
    );
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const savedChunks: ChunkRecord[] = [];
  let totalSize = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkInfo = chunks[i];
    const temp = getTempChunk(uploadId, i);
    if (!temp) {
      return NextResponse.json(
        { error: `Missing chunk at index ${i}` },
        { status: 400 }
      );
    }

    const { iv, tag, telegramFileId } = await saveChunk(
      temp.buffer,
      `${uploadId}-${i}`
    );
    savedChunks.push({
      id: `${uploadId}-${i}`,
      index: i,
      size: temp.buffer.length,
      hash: temp.hash,
      telegramFileId,
      iv,
      tag,
    });
    totalSize += temp.buffer.length;
    removeTempChunk(uploadId, i);
  }

  const ext = getFileExt(name) || "bin";
  const fileKey = `${Date.now()}.${ext}`;
  const origin = getRequestOrigin(req);
  const fileUrl = `${origin}/${fileKey}`;

  const record: FileRecord = {
    id: fileKey,
    filename: name,
    size: totalSize,
    media_type: type || "application/octet-stream",
    uploaded_on: new Date().toISOString(),
    ip: clientIp,
    meta,
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
      filename: name,
      size: totalSize,
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
}
