import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCredentials,
  safeCompare,
  createSessionToken,
  isLoginRateLimited,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Check rate limiting
  if (isLoginRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too Many Login Attempts. Please try again in 15 minutes." },
      {
        status: 429,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
          "Retry-After": "900",
        },
      }
    );
  }

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
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const { adminUser, adminPass } = getAdminCredentials();

  // Constant-time credential check to prevent timing attacks
  if (safeCompare(username.trim(), adminUser) && safeCompare(password, adminPass)) {
    recordSuccessfulLogin(clientIp);

    const token = createSessionToken(adminUser);

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

    res.cookies.set("anubox_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: isHttps,
    });

    return res;
  }

  recordFailedLogin(clientIp);

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
