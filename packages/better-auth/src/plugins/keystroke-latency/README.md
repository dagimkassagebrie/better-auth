# Keystroke Latency Demo Setup

Quick guide to expose the demo locally using ngrok.

## Prerequisites

- [ngrok account](https://ngrok.com/) (free tier works)
- Demo app running locally (e.g., `pnpm dev` on port 3000)

## Setup

### 1. Install ngrok

Download from https://ngrok.com/download or:

```bash
# Windows (in your demo folder)
curl -o ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip
unzip ngrok.zip
```

### 2. Authenticate (one-time)

Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

```bash
./ngrok.exe config add-authtoken YOUR_AUTH_TOKEN
```

### 3. Start ngrok tunnel

```bash
./ngrok.exe http 3000 --region=us
```

Note your public URL (e.g., `https://xyz123.ngrok-free.app`).

Available regions: `us`, `eu`, `ap`, `au`, `in` - pick the closest to you.

### 4. Update auth client

Edit `examples/link-shortener/src/lib/auth-client.ts`:

```ts
export const authClient = createAuthClient({
  baseURL: "https://YOUR-NGROK-URL.ngrok-free.app", // add this
  plugins: [keystrokeLatencyClient()],
});
```

This tells the client SDK where to send auth API requests.

### 5. Start dev server with correct URL

```bash
BETTER_AUTH_URL=https://YOUR-NGROK-URL.ngrok-free.app pnpm dev
```

This ensures OAuth callbacks, cookies, and CSRF validation use the public URL.

### 6. Reset database (if switching from localhost)

```bash
rm sqlite.db
npx @better-auth/cli migrate
```

Existing sessions are tied to `localhost` - fresh DB avoids auth issues.

## Tips

- **Web Inspector**: Open http://127.0.0.1:4040 to monitor HTTP requests
- **Region matters**: Wrong region adds latency (affects demo accuracy)
- Keep ngrok terminal running; closing it kills the tunnel
