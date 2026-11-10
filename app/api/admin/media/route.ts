import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, getDb } from "@/lib/storage";
import { getRequestOrigin } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "100", 10)));

  const db = getDb();
  const total = db.length;
  const start = (page - 1) * limit;
  const origin = getRequestOrigin(req);
  const files = db.slice(start, start + limit).map((f) => {
    return {
      id: f.id,
      url: `${origin}/${f.id}`,
      filename: f.filename,
      size: f.size,
      media_type: f.media_type,
      uploaded_on: f.uploaded_on,
      ip: f.ip,
      meta: f.meta,
      chunks_count: f.chunks.length,
    };
  });

  return NextResponse.json(
    {
      files,
      total,
      page,
      limit,
    },
    {
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
      },
    }
  );
}
