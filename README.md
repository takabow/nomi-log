# nomi-log 🍺

> [!NOTE]
> This application is built for the developer's personal use.
> Currently, only **Japanese** is supported.
>
> ※ 本アプリケーションは開発者自身が使用することを目的として作成しています。
> 現在、**日本語のみ**に対応しています。

A personal alcohol consumption tracker PWA. Visualizes regular analysis of drinking habits (Weekly/Monthly) and provides tools to stay within health guidelines.

## Features

- 📱 **Offline-First PWA**: Works offline, installable on home screen (iOS/Android).
- 📊 **Visual Analytics**: Weekly/Monthly breakdowns of pure alcohol intake (in grams).
- 📅 **Calendar View**: Visual history and bulk editing tools.
- ☁️ **Sync Options**: 
    - **Google Sheets**: Two-way sync via Google Apps Script (GAS).
    - **Local JSON**: Full backup/restore without cloud dependencies.
- 🎨 **Customizable**: Set your own standard drink sizes (presets) and safety thresholds (colors).

## Tech Stack

- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Dexie.js (IndexedDB) + useLiveQuery (Reactive)
- **Icons**: Lucide React
- **Internationalization**: date-fns (locale: ja)
- **Runtime/Build**: Bun

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.0+) recommended, or Node.js (v20+)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/nomi-log.git
   cd nomi-log
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start development server:
   ```bash
   bun dev
   ```

## Configuration (Optional: Google Sheets Sync)

To enable cloud sync:

1. Create a new Google Sheet & Apps Script project.
2. Copy contents of `gas/Code.gs` to the script.
3. Deploy as Web App (Execute as: **Me**, Access: **Anyone**, or restricted if you handle auth manually).
4. Enter the deployment URL in **Settings > Data Sync**.

## Deployment

### Cloudflare - Pages (Recommended for PWA)

1. Build the project locally:
   ```bash
   bun run build
   ```
2. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/?to=/:account/pages).
3. Select **Create a project** > **Direct Upload**.
4. Upload the `dist` directory.

### Google Cloud　- Cloud Run (Container)

This project includes a `Dockerfile` and `nginx.conf` optimized for Cloud Run (SPA routing enabled).

1. Deploy directly from source:
   ```bash
   gcloud run deploy nomi-log --source . --port 8080 --region asia-northeast1 --allow-unauthenticated
   ```

   *Or build manually:*
   ```bash
   docker build -t nomi-log .
   docker run -p 8080:8080 nomi-log
   ```
