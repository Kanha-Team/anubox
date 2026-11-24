import { NextRequest, NextResponse } from "next/server";
import { getFileRecord, readChunk } from "@/lib/storage";
import { getFileExt, getMimeType } from "@/lib/utils";

const DANGEROUS_EXTENSIONS = [
  "html",
  "htm",
  "js",
  "mjs",
  "css",
  "xml",
  "svg",
  "xhtml",
  "php",
  "shtml",
  "vbs",
  "exe",
  "bat",
  "cmd",
  "sh",
  "scr",
  "jar",
];

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } }
) {
  const fileParam = params.file;
  if (!fileParam || typeof fileParam !== "string") {
    return new NextResponse("File Not Found", { status: 404 });
  }

  // Prevent path traversal
  const cleanParam = fileParam.replace(/[\/\\]/g, "").trim();
  if (!cleanParam) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  const record = await getFileRecord(cleanParam);
  if (!record) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  const ext = getFileExt(record.filename || cleanParam);
  const isDangerous = DANGEROUS_EXTENSIONS.includes(ext);

  let contentType = record.media_type;
  if (!contentType || contentType === "application/octet-stream") {
    contentType = getMimeType(record.filename || cleanParam);
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

    // Sanitize filename against CRLF, null bytes and control chars
    const cleanFilename =
      (record.filename || cleanParam)
        .replace(/[\r\n\0\x00-\x1f\x7f]/g, "")
        .trim() || "file";
    const safeFilename = cleanFilename.replace(/["\\]/g, "_");
    const encodedFilename = encodeURIComponent(cleanFilename);
    const disposition = isDangerous ? "attachment" : "inline";

    const baseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "x-powered-by": "AnuBox File Hosting",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Resource-Policy": "cross-origin",
    };

    if (isDangerous) {
      baseHeaders["Content-Security-Policy"] = "default-src 'none'; sandbox";
    }

    // RFC 7233 compliant Range handling
    if (range && range.startsWith("bytes=")) {
      const rangeVal = range.slice(6).trim();
      const parts = rangeVal.split("-");

      let start = 0;
      let end = totalLength - 1;

      if (parts[0] === "") {
        // Suffix range: bytes=-500 (last 500 bytes)
        const suffix = parseInt(parts[1], 10);
        if (isNaN(suffix) || suffix <= 0) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${totalLength}`,
              "x-powered-by": "AnuBox File Hosting",
            },
          });
        }
        start = Math.max(0, totalLength - suffix);
      } else {
        start = parseInt(parts[0], 10);
        if (parts[1] && parts[1].trim() !== "") {
          end = parseInt(parts[1], 10);
        }
      }

      if (
        isNaN(start) ||
        isNaN(end) ||
        start >= totalLength ||
        start > end ||
        start < 0
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalLength}`,
            "x-powered-by": "AnuBox File Hosting",
          },
        });
      }

      end = Math.min(end, totalLength - 1);
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
