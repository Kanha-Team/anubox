import { NextRequest, NextResponse } from "next/server";
import { getFileRecord, readChunk } from "@/lib/storage";
import { getFileExt } from "@/lib/utils";

const DANGEROUS_EXTENSIONS = ["html", "htm", "js", "mjs", "css", "xml", "svg"];

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } }
) {
  const fileParam = params.file;
  if (!fileParam) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  const record = getFileRecord(fileParam);
  if (!record) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  const ext = getFileExt(record.filename || fileParam);
  const isDangerous = DANGEROUS_EXTENSIONS.includes(ext);

  // Check Range Header
  const range = req.headers.get("range");

  try {
    // Read and decrypt all chunks to reconstruct buffer
    const buffers: Buffer[] = [];
    for (const chunk of record.chunks) {
      const buf = await readChunk(chunk);
      buffers.push(buf);
    }
    const fullBuffer = Buffer.concat(buffers);
    const totalLength = fullBuffer.length;

    const baseHeaders: Record<string, string> = {
      "Content-Type": record.media_type || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "x-powered-by": "AnuBox File Hosting",
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (isDangerous) {
      baseHeaders["Content-Disposition"] = `attachment; filename="${encodeURIComponent(
        record.filename
      )}"`;
    } else {
      baseHeaders["Content-Disposition"] = `inline; filename="${encodeURIComponent(
        record.filename
      )}"`;
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (start >= totalLength || end >= totalLength || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalLength}`,
            "x-powered-by": "AnuBox File Hosting",
          },
        });
      }

      const chunk = fullBuffer.subarray(start, end + 1);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${totalLength}`,
          "Content-Length": String(chunk.length),
        },
      });
    }

    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(totalLength),
      },
    });
  } catch (err: any) {
    console.error("Error serving file:", err);
    return new NextResponse("Storage Error", { status: 502 });
  }
}
