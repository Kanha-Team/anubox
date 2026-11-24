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
  if (!adminUser || !adminPass) {
    return NextResponse.json(
      { error: "Admin login is disabled. Please configure ADMIN_USERNAME and ADMIN_PASSWORD in environment variables." },
      {
        status: 503,
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
  }

  // Constant-time credential check to prevent timing attacks
  if (safeCompare(username.trim(), adminUser) && safeCompare(password, adminPass)) {
    recordSuccessfulLogin(clientIp);

    const token = createSessionToken(adminUser);

    // Direct token response - NO COOKIES SET
    return NextResponse.json(
      {
        success: true,
        token,
      },
      {
        headers: {
          "x-powered-by": "AnuBox File Hosting",
          "x-api-version": "4.0",
        },
      }
    );
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
