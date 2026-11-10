import { NextResponse } from "next/server";

export async function GET() {
  const maxSizeMB = Number(process.env.MAX_SIZE_MB || 100);
  const authRequired = process.env.ENABLE_AUTH === "true";

  return NextResponse.json(
    {
      maxSizeMB,
      chunkSize: 4000000,
      authRequired,
      encrypted: true,
    },
    {
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
        "cache-control": "no-store",
      },
    }
  );
}
