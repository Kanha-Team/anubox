# 📦 AnuBox File Hosting Web

<div align="center">

![AnuBox Logo](public/assets/img/logo.jpg)

### Free, Fast And Permanent File Hosting

Upload Images, Videos, Audio, and Documents and get a permanent direct link in seconds. Files up to 100 MB, no account needed, encrypted before they are stored.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Telegram](https://img.shields.io/badge/Telegram-@xoknha-2CA5E0.svg?style=for-the-badge&logo=telegram)](https://t.me/xoknha)

</div>

---

## 🚀 Features

- ⚡ **Instant Direct Links**: Every upload gets a permanent, stable link ending in its proper extension (`/{timestamp}.{ext}`).
- 🔒 **Client & Server-Side Encryption**: Files are sliced into pieces and encrypted with AES-256-GCM before reaching storage.
- ☁️ **Telegram Unlimited Cloud Storage**: Chunks are uploaded and preserved reliably on Telegram.
- 📱 **QR Code Sharing**: Instant one-click QR code generation with download option.
- 🌐 **Remote Link Import (`/hosturl`)**: Import files from any public URL with SSRF protection.
- 🧩 **Chunked Uploads**: 4MB chunked streaming upload with real-time speed, progress rings, and ETA calculations.
- 🛡️ **Admin Dashboard**: Full file inspection, search, preview, IP logging, and bulk deletion at `/admin`.
- 📖 **Complete API**: REST endpoints for cURL, JavaScript, and Python integration with `/docs`.
- 📊 **Service Status**: Real-time status checks, health monitoring, and activity breakdown at `/status`.
- ⚖️ **Terms & Conditions**: Full legal terms and acceptable use policy at `/terms`.
- 🌓 **Themes**: System, Light, and Dark modes.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI & Components**: React 18, Custom Glassmorphic & Modern CSS, Lucide SVGs
- **Encryption**: AES-256-GCM
- **QR Code**: QRCode.js
- **Backend / API**: Next.js Server Components & Route Handlers

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `MAX_SIZE_MB` | Maximum allowed upload size in MB | `100` |
| `ENABLE_AUTH` | Require admin auth for all uploads | `false` |
| `ENCRYPTION_KEY` | Master key for AES-256-GCM encryption | auto-generated |
| `ADMIN_USERNAME` | Username for `/admin` | *(required for admin access)* |
| `ADMIN_PASSWORD` | Password for `/admin` | *(required for admin access)* |
| `BOT_TOKEN` | Telegram Bot API token | *(optional)* |
| `BOT_CHAT_ID` | Telegram chat ID for storage | *(optional)* |

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

---

## 👨‍💻 Creator

- **Ayush (Kanha)** — [@Kanha-Team](https://github.com/Kanha-Team)
- **Telegram**: [@xoknha](https://t.me/xoknha)

---

## 📄 License

This project is licensed under the MIT License.
