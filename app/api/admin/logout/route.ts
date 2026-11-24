import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
      },
    }
  );
}
