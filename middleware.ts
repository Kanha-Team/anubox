import { NextRequest, NextResponse } from "next/server";

const KEY_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ENCRYPTION_KEY ||
  process.env.ADMIN_PASSWORD ||
  "anubox_master_session_key_2026_xyz";

let cachedKey: CryptoKey | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(KEY_SECRET);
  const keyDigest = await crypto.subtle.digest("SHA-256", secretBytes);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyDigest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return cachedKey;
}

async function verifyEdgeToken(token: string | undefined): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const [, payloadB64, sigHex] = parts;
  if (sigHex.length !== 64) return false;

  try {
    const key = await getHmacKey();
    const dataToVerify = new TextEncoder().encode(`v1.${payloadB64}`);
    const sigBytes = new Uint8Array(
      sigHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const validSig = await crypto.subtle.verify("HMAC", key, sigBytes, dataToVerify);
    if (!validSig) return false;

    // Check payload expiration
    const payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr);

    if (!payload.exp || Date.now() > payload.exp) {
      return false;
    }

    const validAdminUser = process.env.ADMIN_USERNAME || process.env.USERNAME || "admin";
    if (payload.u !== validAdminUser) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function verifyBasicAuth(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Basic ")) return false;
  try {
    const b64 = authHeader.slice(6);
    const decoded = atob(b64);
    const [u, p] = decoded.split(":");
    const validUser = process.env.ADMIN_USERNAME || process.env.USERNAME || "admin";
    const validPass = process.env.ADMIN_PASSWORD || process.env.PASSWORD || "admin123";
    return u === validUser && p === validPass;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect Admin Dashboard UI (/admin and /admin/* except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionCookie = req.cookies.get("anubox_session")?.value;
    const isValid = await verifyEdgeToken(sessionCookie);

    if (!isValid) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
      const res = NextResponse.redirect(loginUrl);
      // Clear any invalid/forged cookie
      res.cookies.delete("anubox_session");
      return res;
    }
  }

  // Protect Admin API routes (/api/admin/* except /api/admin/login)
  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login") {
    const sessionCookie = req.cookies.get("anubox_session")?.value;
    const isTokenValid = await verifyEdgeToken(sessionCookie);
    const isBasicValid = verifyBasicAuth(req.headers.get("authorization"));

    if (!isTokenValid && !isBasicValid) {
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
  }

  const res = NextResponse.next();

  // Add global security headers
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/delete-images",
  ],
};
