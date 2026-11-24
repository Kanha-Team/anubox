import crypto from "crypto";

// Secret for HMAC signing of session tokens
const KEY_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ENCRYPTION_KEY ||
  process.env.ADMIN_PASSWORD ||
  "anubox_master_session_key_2026_xyz";

const SESSION_HMAC_KEY = crypto.createHash("sha256").update(KEY_SECRET).digest();

export interface SessionPayload {
  u: string; // username
  iat: number; // issued at (ms)
  exp: number; // expires at (ms)
  nonce: string; // random nonce
}

export function getAdminCredentials() {
  const adminUser = process.env.ADMIN_USERNAME || process.env.USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || process.env.PASSWORD || "admin123";
  return { adminUser, adminPass };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Generate a cryptographically signed HMAC-SHA256 session token
 */
export function createSessionToken(username: string): string {
  const now = Date.now();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload: SessionPayload = {
    u: username,
    iat: now,
    exp: now + maxAgeMs,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const dataToSign = `v1.${payloadB64}`;
  const sig = crypto.createHmac("sha256", SESSION_HMAC_KEY).update(dataToSign).digest("hex");

  return `${dataToSign}.${sig}`;
}

/**
 * Verify a cryptographically signed session token
 */
export function verifySessionToken(token: string | null | undefined): {
  valid: boolean;
  username?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return { valid: false };
  }

  const [, payloadB64, sigHex] = parts;
  const dataToSign = `v1.${payloadB64}`;
  const expectedSig = crypto.createHmac("sha256", SESSION_HMAC_KEY).update(dataToSign).digest("hex");

  // Constant-time check on signature
  const sigBuf = Buffer.from(sigHex, "utf-8");
  const expectedSigBuf = Buffer.from(expectedSig, "utf-8");
  if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return { valid: false };
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Check expiration
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }

    // Verify username matches current admin username
    const { adminUser } = getAdminCredentials();
    if (!safeCompare(payload.u, adminUser)) {
      return { valid: false };
    }

    return { valid: true, username: payload.u };
  } catch {
    return { valid: false };
  }
}

/**
 * Parse anubox_session from the Cookie header
 */
export function extractSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const c of cookies) {
    const [rawName, ...rawVal] = c.trim().split("=");
    if (rawName === "anubox_session") {
      return rawVal.join("=");
    }
  }
  return null;
}

/**
 * Backend check for admin authentication:
 * Validates either a cryptographically signed cookie OR HTTP Basic Auth
 */
export function checkAdminAuth(req: Request): boolean {
  // 1. Check Cryptographic Session Cookie
  const cookieHeader = req.headers.get("cookie");
  const sessionToken = extractSessionCookie(cookieHeader);
  if (sessionToken) {
    const verification = verifySessionToken(sessionToken);
    if (verification.valid) {
      return true;
    }
  }

  // 2. Check Basic Auth (timing-safe)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const b64 = authHeader.slice(6);
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      const colonIndex = decoded.indexOf(":");
      if (colonIndex !== -1) {
        const u = decoded.slice(0, colonIndex);
        const p = decoded.slice(colonIndex + 1);
        const { adminUser, adminPass } = getAdminCredentials();
        if (safeCompare(u, adminUser) && safeCompare(p, adminPass)) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

// In-memory rate limiting for login attempts
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}
const loginRateLimit = new Map<string, RateLimitRecord>();

export function isLoginRateLimited(ip: string): boolean {
  const record = loginRateLimit.get(ip);
  if (!record) return false;
  if (Date.now() > record.lockedUntil) {
    loginRateLimit.delete(ip);
    return false;
  }
  return record.attempts >= 5;
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginRateLimit.get(ip) || { attempts: 0, lockedUntil: now + 15 * 60 * 1000 };
  record.attempts += 1;
  record.lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes
  loginRateLimit.set(ip, record);
}

export function recordSuccessfulLogin(ip: string): void {
  loginRateLimit.delete(ip);
}
