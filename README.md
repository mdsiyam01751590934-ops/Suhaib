# Unlim Cloud

A modern, production-ready cloud storage and media vault application powered entirely by **Telegram MTProto API**. Unlim Cloud transforms your personal Telegram account's **Saved Messages** into an unlimited, high-speed, and secure personal cloud drive with a sleek, desktop-class web interface.

---

## ⚡ Architecture Overview

Unlike traditional cloud drives that rely on heavy relational databases (PostgreSQL, MySQL) or third-party cloud storage buckets (S3, Firebase, Supabase), **Unlim Cloud is 100% database-free and zero-server-storage**:

```text
User Browser (React + TypeScript)
       │
       ▼
Express API Backend (Node.js + TS)
       │
       ▼ (MTProto Streaming Engine)
Telegram MTProto API
       │
       ▼
User's Own Telegram Account
       │
       ▼
Saved Messages ("me" peer)
       │
       ▼
[UNLIM_FILE_V1] Tagged Files & Captions
```

### Key Architectural Principles

1. **Zero Database Dependencies**: All file metadata (file name, virtual folder, starred status, trash status, mime type) is stored directly inside message captions within Telegram Saved Messages using our compact metadata tag format:
   ```text
   [UNLIM_FILE_V1][NAME:base64][FOLDER:base64][STAR:0/1][TRASH:0/1][MIME:base64]
   ```
2. **Zero Server Storage**: Files uploaded by the user are streamed chunk-by-chunk directly into Telegram MTProto. Downloads are piped directly from Telegram to the client's browser without saving copies to the local disk.
3. **Encrypted Session Store**: MTProto session strings are encrypted at rest on the server using **AES-256-GCM** and decrypted only in memory when active requests are handled.
4. **Direct User Ownership**: Every file belongs exclusively to the authenticated user's Telegram account, accessible anytime from the official Telegram apps.

---

## 🚀 Key Features

- 📁 **Complete File Explorer**: Grid and List view modes, instant multi-selection, batch actions (Move, Trash, Delete, Download).
- 🗂️ **Virtual Folders & Hierarchy**: Nested folder organization with breadcrumbs and file count badges.
- 🖼️ **Media Lightbox & Gallery**: In-browser preview for images, video streaming, audio player, and PDF viewing.
- ⭐ **Favorites & Recent Activity**: Star files for quick access and filter uploads chronologically.
- 🗑️ **Recycling Bin & Recovery**: Soft-delete files to Trash with 1-click restore or permanent wipe from Telegram.
- 🔐 **Dual Auth Flow**:
  - **Telegram MTProto Login**: Direct phone number authentication with code verification and 2FA password support.
  - **Admin / Demo Console**: Password-protected administrative view for telemetry, MTProto diagnostics, and session health.
- 🌗 **Adaptive UI / Dark & Light Mode**: Clean Tailwind styling, glassmorphism accents, keyboard navigation, and responsive mobile drawer.

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env` and configure your credentials:

```env
# Telegram MTProto Credentials (Obtain from https://my.telegram.org)
TELEGRAM_API_ID="12345678"
TELEGRAM_API_HASH="0123456789abcdef0123456789abcdef"

# Security & Encryption Keys
SESSION_SECRET="your-secure-session-secret-at-least-32-characters"
ENCRYPTION_KEY="your-super-secure-aes256-encryption-key"

# Administrative Access (Optional)
ADMIN_EMAIL="admin@unlimcloud.com"
ADMIN_PASSWORD="admin123456"
```

### How to obtain Telegram API ID & Hash:
1. Log in to [my.telegram.org](https://my.telegram.org) with your Telegram phone number.
2. Navigate to **API development tools**.
3. Create a new application (e.g. `UnlimCloudApp`).
4. Copy the `api_id` and `api_hash` values into your `.env` file.

---

## 📦 Getting Started

### Development
```bash
npm install
npm run dev
```

### Production Build & Launch
```bash
npm run build
npm start
```

---

## 🔒 Security & Privacy

- **Data Sovereignty**: Files are stored exclusively in the user's private Telegram Saved Messages vault.
- **Session Protection**: Encrypted sessions prevent credential exposure and protect against session hijacking.
- **Direct Stream Security**: No intermediate bot tokens, shared storage buckets, or publicly accessible links are generated.
