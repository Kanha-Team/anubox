import { NextRequest, NextResponse } from "next/server";
import {
  getTempChunk,
  removeTempChunk,
  saveChunk,
  addFileRecord,
  FileRecord,
  ChunkRecord,
  checkAdminAuth,
} from "@/lib/storage";
import { getFileExt, getMimeType, getRequestOrigin } from "@/lib/utils";

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
    const chunkInfo = chunks[i] || {};
    let iv = chunkInfo.iv;
    let tag = chunkInfo.tag;
    let telegramFileId = chunkInfo.telegramFileId;
    let chunkSize = Number(chunkInfo.size) || 0;
    let hash = chunkInfo.hash || "";

    // If chunk was not already encrypted/persisted by upload/chunk, use in-memory temp chunk
    if (!iv || !tag) {
      const temp = getTempChunk(uploadId, i);
      if (!temp) {
        return NextResponse.json(
          { error: `Missing chunk at index ${i}` },
          { status: 400 }
        );
      }
      const saved = await saveChunk(temp.buffer, `${uploadId}-${i}`);
      iv = saved.iv;
      tag = saved.tag;
      telegramFileId = saved.telegramFileId;
      chunkSize = temp.buffer.length;
      hash = temp.hash;
    }

    removeTempChunk(uploadId, i);

    savedChunks.push({
      id: `${uploadId}-${i}`,
      index: i,
      size: chunkSize,
      hash,
      telegramFileId,
      iv,
      tag,
    });
    totalSize += chunkSize;
  }

  const ext = getFileExt(name) || "bin";
  const fileKey = `${Date.now()}.${ext}`;
  const origin = getRequestOrigin(req);
  const fileUrl = `${origin}/${fileKey}`;

  let mediaType = type;
  if (!mediaType || mediaType === "application/octet-stream") {
    mediaType = getMimeType(name);
  }

  const record: FileRecord = {
    id: fileKey,
    filename: name,
    size: totalSize,
    media_type: mediaType,
    uploaded_on: new Date().toISOString(),
    ip: clientIp,
    meta,
    chunks: savedChunks,
  };

  await addFileRecord(record);

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
