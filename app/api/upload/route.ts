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
import { getFileExt, getRequestOrigin } from "@/lib/utils";

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_AUTH === "true" && !checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected Multipart/Form-Data" },
      {
        status: 400,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse multipart form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No File Provided In Form Field 'file'" },
      { status: 400 }
    );
  }

  const maxSizeMB = Number(process.env.MAX_SIZE_MB || 100);
  if (file.size > maxSizeMB * 1024 * 1024) {
    return NextResponse.json(
      { error: `File Exceeds Max Size Of ${maxSizeMB} MB` },
      { status: 413 }
    );
  }

  const arrayBuf = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuf);
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

  const ext = getFileExt(file.name) || "bin";
  const fileKey = `${Date.now()}.${ext}`;
  const origin = getRequestOrigin(req);
  const fileUrl = `${origin}/${fileKey}`;

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const record: FileRecord = {
    id: fileKey,
    filename: file.name,
    size: fileBuffer.length,
    media_type: file.type || "application/octet-stream",
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
      filename: file.name,
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
}
