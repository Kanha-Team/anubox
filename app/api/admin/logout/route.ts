import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    {
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
      },
    }
  );

  res.cookies.set("anubox_session", "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });

  return res;
}
