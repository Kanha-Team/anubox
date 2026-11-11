import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ChunkRecord {
  id: string;
  index: number;
  size: number;
  hash: string;
  telegramFileId?: string;
  iv: string; // hex
  tag: string; // hex
}

export interface FileRecord {
  id: string;
  filename: string;
  size: number;
  media_type: string;
  uploaded_on: string;
  ip?: string;
  meta?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  chunks: ChunkRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORAGE_DIR = path.join(DATA_DIR, "chunks");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]), "utf-8");
}

ensureDirs();

export function getDb(): FileRecord[] {
  try {
    ensureDirs();
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

export function saveDb(records: FileRecord[]) {
  ensureDirs();
  const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), "utf-8");
  }
}

export function getFileRecord(id: string): FileRecord | undefined {
  const db = getDb();
  return db.find((r) => r.id === id || r.id === `${id}`);
}

export function deleteFileRecord(id: string): boolean {
  const db = getDb();
  const file = db.find((r) => r.id === id);
  if (!file) return false;

  // Clean local chunks if present
  for (const c of file.chunks) {
    const chunkPath = path.join(STORAGE_DIR, c.id);
    if (fs.existsSync(chunkPath)) {
      try {
        fs.unlinkSync(chunkPath);
      } catch {}
    }
  }

  const filtered = db.filter((r) => r.id !== id);
  saveDb(filtered);
  return true;
}

// AES-256-GCM Encryption
const KEY_SECRET = process.env.ENCRYPTION_KEY || "anubox_secret_master_encryption_key_2026_xyz";
const CIPHER_KEY = crypto.createHash("sha256").update(KEY_SECRET).digest();

export function encryptBuffer(buffer: Buffer): { encrypted: Buffer; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", CIPHER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decryptBuffer(encrypted: Buffer, ivHex: string, tagHex: string): Buffer {
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", CIPHER_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// Telegram integration
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_CHAT_ID = process.env.BOT_CHAT_ID;

export async function uploadChunkToTelegram(
  chunkBuffer: Buffer,
  chunkFilename: string
): Promise<string | null> {
  if (!BOT_TOKEN || !BOT_CHAT_ID) return null;
  try {
    const boundary = "----AnuBoxFormBoundary" + Math.random().toString(36).substring(2);
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${BOT_CHAT_ID}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${chunkFilename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, chunkBuffer, tail]);

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    const json = await res.json();
    if (json.ok && json.result?.document?.file_id) {
      return json.result.document.file_id;
    }
  } catch (err) {
    console.error("Telegram upload error:", err);
  }
  return null;
}

export async function fetchChunkFromTelegram(fileId: string): Promise<Buffer | null> {
  if (!BOT_TOKEN) return null;
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const info = await infoRes.json();
    if (!info.ok || !info.result?.file_path) return null;
    const fileRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${info.result.file_path}`);
    const arrayBuf = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("Telegram download error:", err);
    return null;
  }
}

export async function saveChunk(
  chunkBuffer: Buffer,
  chunkId: string
): Promise<{ iv: string; tag: string; telegramFileId?: string }> {
  const { encrypted, iv, tag } = encryptBuffer(chunkBuffer);

  let telegramFileId: string | undefined;
  if (BOT_TOKEN && BOT_CHAT_ID) {
    const tgId = await uploadChunkToTelegram(encrypted, `${chunkId}.enc`);
    if (tgId) telegramFileId = tgId;
  }

  // Always save locally or when TG not available
  ensureDirs();
  const chunkPath = path.join(STORAGE_DIR, chunkId);
  fs.writeFileSync(chunkPath, encrypted);

  return { iv, tag, telegramFileId };
}

export async function readChunk(chunk: ChunkRecord): Promise<Buffer> {
  let encryptedBuf: Buffer | null = null;

  if (chunk.telegramFileId) {
    encryptedBuf = await fetchChunkFromTelegram(chunk.telegramFileId);
  }

  if (!encryptedBuf) {
    const chunkPath = path.join(STORAGE_DIR, chunk.id);
    if (fs.existsSync(chunkPath)) {
      encryptedBuf = fs.readFileSync(chunkPath);
    }
  }

  if (!encryptedBuf) {
    throw new Error(`Chunk ${chunk.id} could not be retrieved from storage.`);
  }

  return decryptBuffer(encryptedBuf, chunk.iv, chunk.tag);
}

// Temporary in-flight chunk upload cache with auto-expiration
interface TempChunk {
  buffer: Buffer;
  hash: string;
  createdAt: number;
}
const inFlightChunks = new Map<string, TempChunk>();

function pruneTempChunks() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  inFlightChunks.forEach((value, key) => {
    if (now - value.createdAt > maxAge) {
      inFlightChunks.delete(key);
    }
  });
}

export function storeTempChunk(uploadId: string, index: number, buffer: Buffer, hash: string) {
  pruneTempChunks();
  inFlightChunks.set(`${uploadId}-${index}`, { buffer, hash, createdAt: Date.now() });
}

export function getTempChunk(uploadId: string, index: number) {
  return inFlightChunks.get(`${uploadId}-${index}`);
}

export function removeTempChunk(uploadId: string, index: number) {
  inFlightChunks.delete(`${uploadId}-${index}`);
}

// Admin Auth Helper
export function checkAdminAuth(req: Request): boolean {
  const adminUser = process.env.ADMIN_USERNAME || process.env.USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || process.env.PASSWORD || "admin123";

  // Check Cookie
  const cookieHeader = req.headers.get("cookie") || "";
  if (cookieHeader.includes("anubox_session=authenticated")) {
    return true;
  }

  // Check Basic Auth
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const b64 = authHeader.slice(6);
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      const [u, p] = decoded.split(":");
      if (u === adminUser && p === adminPass) {
        return true;
      }
    } catch {}
  }

  return false;
}
