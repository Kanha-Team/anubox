import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON Body" },
      { status: 400 }
    );
  }

  const { username, password } = body || {};
  const validUser = process.env.ADMIN_USERNAME || process.env.USERNAME || "admin";
  const validPass = process.env.ADMIN_PASSWORD || process.env.PASSWORD || "admin123";

  if (username === validUser && password === validPass) {
    const res = NextResponse.json(
      { success: true },
      {
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );

    const isHttps =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";

    res.cookies.set("anubox_session", "authenticated", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: isHttps,
    });

    return res;
  }

  return NextResponse.json(
    { error: "That Username Or Password Is Not Right." },
    {
      status: 401,
      headers: {
        "x-powered-by": "AnuBox File Hosting",
        "x-api-version": "4.0",
      },
    }
  );
}
