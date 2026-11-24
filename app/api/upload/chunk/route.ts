import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { storeTempChunk, saveChunk, checkAdminAuth } from "@/lib/storage";

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_AUTH === "true" && !checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = req.headers.get("x-upload-id");
  const chunkIndexStr = req.headers.get("x-chunk-index");
  const fileName = req.headers.get("x-file-name");

  if (!uploadId || uploadId.length < 8) {
    return NextResponse.json(
      { error: "Invalid Upload ID" },
      {
        status: 400,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  }

  if (chunkIndexStr === null || isNaN(Number(chunkIndexStr))) {
    return NextResponse.json(
      { error: "Invalid Chunk Index" },
      { status: 400 }
    );
  }

  const chunkIndex = parseInt(chunkIndexStr, 10);
  const arrayBuf = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  if (buffer.length === 0) {
    return NextResponse.json(
      { error: "Chunk Is Empty" },
      { status: 400 }
    );
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const chunkId = `${uploadId}-${chunkIndex}`;

  // Encrypt and persist chunk immediately
  const { iv, tag, telegramFileId } = await saveChunk(buffer, chunkId);

  // Also cache in memory for backwards compatibility
  storeTempChunk(uploadId, chunkIndex, buffer, hash);

  return NextResponse.json(
    {
      id: chunkId,
      index: chunkIndex,
      size: buffer.length,
      hash,
      iv,
      tag,
      telegramFileId,
      fileName: fileName ? decodeURIComponent(fileName) : undefined,
    },
    {
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
      },
    }
  );
}
