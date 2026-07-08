# Discord Message Logger

A small Node.js app with two parts:
1. **Bot** (discord.js) — listens to every message create/edit/delete and saves it to a SQLite database.
2. **API** (Express) — lets you query the stored messages over HTTP.

Fields stored per message: `id`, `guildId`, `channelId`, `authorId`, `authorTag`, `content`, `repliedToId` (the message it replied to), `attachments`, `createdAt`, `editedAt`, `deletedAt`. Every edit is also kept in a full history table (`message_edits`).

---

## 1. Create the Discord bot (5 min, in browser)

1. Go to https://discord.com/developers/applications → **New Application**.
2. Left sidebar → **Bot** → **Reset Token** → copy it (this is your `DISCORD_TOKEN`). Keep it secret.
3. On the same Bot page, scroll to **Privileged Gateway Intents** and turn ON **Message Content Intent**. Without this the bot cannot read message text.
4. Left sidebar → **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Read Messages/View Channels`, `Read Message History`
   - Copy the generated URL, open it, and add the bot to your server.

## 2. Get the code onto GitHub (needed for step 3, works fully from an iPhone browser)

1. Create a free GitHub account if you don't have one.
2. Create a new empty repository, e.g. `discord-logger`.
3. Easiest no-terminal way to upload from a phone: on the repo page tap **Add file → Upload files**, then upload every file in this folder (keeping the `src/` folder structure). Don't upload `.env` — only `.env.example`.

*(If you ever get access to a laptop, the normal way is `git init && git add . && git commit -m "init" && git remote add origin <repo-url> && git push`.)*

## 3. Deploy — Railway (recommended, no terminal, no VPS needed)

Railway builds and runs the app from your GitHub repo, entirely through the browser — good fit since you're on iPhone.

1. Go to https://railway.app → sign in with GitHub.
2. **New Project → Deploy from GitHub repo** → pick `discord-logger`.
3. Railway auto-detects Node.js and runs `npm install` + `npm start`.
4. Open the project → **Variables** tab → add:
   - `DISCORD_TOKEN` = your bot token
   - `API_KEY` = any long random string you make up
   - `DB_PATH` = `/data/messages.db`
   - (optional) `GUILD_ID_WHITELIST` = comma-separated server IDs
5. **Add a Volume** (Settings → Volumes → New Volume) and mount it at `/data`. This is important — without a volume, the SQLite file is wiped on every redeploy.
6. Deploy. Check the **Deployments → Logs** tab — you should see `Logged in as YourBot#1234` and `API listening on port ...`.
7. Settings → **Networking → Generate Domain** gives you a public URL for the API, e.g. `https://discord-logger-production.up.railway.app`.

### Alternatives
- **Render.com** — same idea (GitHub → Web Service), free tier available; add a persistent disk under the service's "Disks" tab for the same reason as the Railway volume.
- **A VPS** (DigitalOcean, Hetzner) — more control, but you'd need SSH access. From an iPhone you can do this with the **Termius** app (SSH client) without a computer, but it's more manual setup (installing Node, PM2, etc.) — only worth it if Railway/Render don't fit your needs.

## 4. Query the API

```
GET https://<your-domain>/messages?guildId=123&limit=50
GET https://<your-domain>/messages/<messageId>
```
Header required on every request: `x-api-key: <the API_KEY you set>`

## Local file reference
```
discord-logger/
├── package.json
├── .env.example      # copy to .env for local testing
├── src/
│   ├── config.js      # loads env vars
│   ├── db.js           # SQLite schema + save/edit/delete helpers
│   ├── discordClient.js # bot event listeners
│   ├── server.js        # Express API
│   └── index.js          # starts bot + API together
```

## Notes
- The bot currently skips messages from other bots (`message.author.bot`) — delete that check in `src/discordClient.js` if you want those logged too.
- `MessageContent` is a *privileged* intent — Discord requires it to be explicitly enabled in the dev portal (step 1.3) or the bot will connect but `content` will always be empty.
- If you outgrow SQLite (very high message volume across many servers), swap `better-sqlite3` for a hosted Postgres — Railway offers one-click Postgres you can add later.
