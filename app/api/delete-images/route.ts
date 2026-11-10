import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, deleteFileRecord } from "@/lib/storage";

async function handleDelete(req: NextRequest) {
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Expected JSON body with array of file URLs or IDs" },
      { status: 400 }
    );
  }

  const items = Array.isArray(body) ? body : [body];
  const deleted: string[] = [];

  for (const item of items) {
    const raw = typeof item === "string" ? item : item?.url || item?.id;
    if (!raw) continue;
    const id = raw.split("?")[0].split("/").filter(Boolean).pop();
    if (id && deleteFileRecord(id)) {
      deleted.push(id);
    }
  }

  return NextResponse.json(
    {
      success: true,
      deleted,
      count: deleted.length,
    },
    {
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  return handleDelete(req);
}

export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}
