/**
 * AnuBox Telegram Bot
 *
 * This companion bot allows users to send photos, videos, audio, and documents
 * on Telegram and instantly get permanent AnuBox direct links!
 *
 * Setup:
 * 1. Set BOT_TOKEN in .env (get it from @BotFather)
 * 2. Set NEXT_PUBLIC_SITE_URL or SITE_URL (e.g. https://anubox.vercel.app)
 * 3. Run: npm run bot
 */

const BOT_TOKEN = process.env.BOT_TOKEN;
const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://anubox.vercel.app";

if (!BOT_TOKEN) {
  console.log("⚠️  BOT_TOKEN is not set in environment or .env file.");
  console.log("👉 Get a bot token from @BotFather on Telegram and set BOT_TOKEN in .env");
  process.exit(1);
}

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tgRequest(method, payload = {}) {
  const url = `${TG_API}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return tgRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    ...extra,
  });
}

async function getFileUrl(fileId) {
  const res = await tgRequest("getFile", { file_id: fileId });
  if (res.ok && res.result?.file_path) {
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${res.result.file_path}`;
  }
  return null;
}

let offset = 0;

async function pollUpdates() {
  try {
    const res = await tgRequest("getUpdates", {
      offset,
      timeout: 30,
      allowed_updates: ["message"],
    });

    if (res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        if (update.message) {
          handleMessage(update.message).catch(console.error);
        }
      }
    }
  } catch (err) {
    console.error("Polling error:", err.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
  setImmediate(pollUpdates);
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  // /start
  if (text.startsWith("/start")) {
    return sendMessage(
      chatId,
      `✨ <b>Welcome to AnuBox Bot!</b> 📦\n\n` +
        `Free, fast, and permanent encrypted file hosting.\n\n` +
        `⚡ <b>How to use:</b>\n` +
        `• Send me any <b>Photo, Video, Audio, or Document</b> (up to 100 MB)\n` +
        `• Send a <b>public download link</b> to import\n\n` +
        `🌐 <b>Web App:</b> ${SITE_URL}\n` +
        `📖 <b>API Docs:</b> ${SITE_URL}/docs\n` +
        `📊 <b>Status:</b> ${SITE_URL}/status`
    );
  }

  // Handle URL link
  if (text.startsWith("http://") || text.startsWith("https://")) {
    await sendMessage(chatId, "⏳ <i>Importing your link to AnuBox...</i>");
    try {
      const res = await fetch(
        `${SITE_URL}/api/hosturl?url=${encodeURIComponent(text.trim())}`
      );
      const data = await res.json();
      if (res.ok && (data.url || data.data)) {
        const link = data.url || data.data;
        return sendMessage(
          chatId,
          `✅ <b>File Imported Successfully!</b>\n\n` +
            `📁 <b>File:</b> <code>${data.filename || "file"}</code>\n` +
            `🔗 <b>Direct Link:</b>\n${link}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🌐 Open File", url: link }]],
            },
          }
        );
      } else {
        return sendMessage(
          chatId,
          `❌ <b>Import Failed:</b> ${data.error || "Could not fetch file"}`
        );
      }
    } catch (err) {
      return sendMessage(chatId, `❌ <b>Error:</b> ${err.message}`);
    }
  }

  // Check for media
  let fileId = null;
  let fileName = "file";

  if (msg.document) {
    fileId = msg.document.file_id;
    fileName = msg.document.file_name || "document";
  } else if (msg.photo && msg.photo.length) {
    fileId = msg.photo[msg.photo.length - 1].file_id;
    fileName = `photo_${Date.now()}.jpg`;
  } else if (msg.video) {
    fileId = msg.video.file_id;
    fileName = msg.video.file_name || `video_${Date.now()}.mp4`;
  } else if (msg.audio) {
    fileId = msg.audio.file_id;
    fileName = msg.audio.file_name || `audio_${Date.now()}.mp3`;
  } else if (msg.voice) {
    fileId = msg.voice.file_id;
    fileName = `voice_${Date.now()}.ogg`;
  }

  if (fileId) {
    await sendMessage(chatId, "⚡ <i>Processing & encrypting your file...</i>");
    try {
      const downloadUrl = await getFileUrl(fileId);
      if (!downloadUrl) {
        return sendMessage(
          chatId,
          "❌ Could not retrieve file from Telegram servers."
        );
      }

      // Import via hosturl
      const res = await fetch(
        `${SITE_URL}/api/hosturl?url=${encodeURIComponent(downloadUrl)}`
      );
      const data = await res.json();
      if (res.ok && (data.url || data.data)) {
        const link = data.url || data.data;
        return sendMessage(
          chatId,
          `✅ <b>File Uploaded to AnuBox!</b>\n\n` +
            `📁 <b>Name:</b> <code>${fileName}</code>\n` +
            `🔗 <b>Direct Permanent Link:</b>\n${link}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🌐 Open Link", url: link },
                  { text: "📦 Open AnuBox", url: SITE_URL },
                ],
              ],
            },
          }
        );
      } else {
        return sendMessage(
          chatId,
          `❌ <b>Upload Failed:</b> ${data.error || "Server Error"}`
        );
      }
    } catch (err) {
      return sendMessage(chatId, `❌ <b>Error:</b> ${err.message}`);
    }
  }
}

console.log("🚀 AnuBox Telegram Bot is running...");
pollUpdates();
