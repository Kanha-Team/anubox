import { NextRequest, NextResponse } from "next/server";
import { getFileRecord, readChunk } from "@/lib/storage";
import { getFileExt, getMimeType } from "@/lib/utils";

const DANGEROUS_EXTENSIONS = ["html", "htm", "js", "mjs", "css", "xml", "svg"];

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } }
) {
  const fileParam = params.file;
  if (!fileParam) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  const record = await getFileRecord(fileParam);
  if (!record) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  const ext = getFileExt(record.filename || fileParam);
  const isDangerous = DANGEROUS_EXTENSIONS.includes(ext);

  let contentType = record.media_type;
  if (!contentType || contentType === "application/octet-stream") {
    contentType = getMimeType(record.filename || fileParam);
  }

  // Check Range Header
  const range = req.headers.get("range");

  try {
    if (!record.chunks || record.chunks.length === 0) {
      return new NextResponse("File Has No Content", { status: 404 });
    }

    // Read and decrypt all chunks to reconstruct buffer
    const buffers: Buffer[] = [];
    for (const chunk of record.chunks) {
      const buf = await readChunk(chunk);
      buffers.push(buf);
    }
    const fullBuffer = Buffer.concat(buffers);
    const totalLength = fullBuffer.length;

    const cleanFilename = (record.filename || fileParam).replace(/[\r\n]/g, "");
    const safeFilename = cleanFilename.replace(/["\\]/g, "_");
    const encodedFilename = encodeURIComponent(cleanFilename);
    const disposition = isDangerous ? "attachment" : "inline";

    const baseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "x-powered-by": "AnuBox File Hosting",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
    };

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
