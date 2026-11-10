# Deploy to Vercel — Step by Step

## Prerequisites
- Node.js 18+ installed
- A Supabase project (schema in `supabase/schema.sql`)
- An Anthropic API key
- A GitHub account (for easiest Vercel deploy)

---

## Option A: Deploy via Vercel CLI (fastest — 2 commands)

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. From the repo root
npm install
vercel
```

Vercel will prompt you to log in, then ask a few questions (accept defaults).
When asked for environment variables, add:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` (optional)

**Your app is live.** Vercel gives you a URL like `https://nytra-abc123.vercel.app`.

---

## Option B: Deploy via GitHub (recommended for ongoing dev)

### Step 1 — Fork the repo
Fork [Vedant-Singhal/nytra-ai-sleep-coach](https://github.com/Vedant-Singhal/nytra-ai-sleep-coach) to your GitHub account.

### Step 2 — Import on Vercel
1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select your fork of `nytra-ai-sleep-coach`
4. Framework: **Next.js** (auto-detected)
5. Add environment variables:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` = your Spotify client ID (optional; add `https://<your-domain>/music` as a redirect URI in the Spotify dashboard)
6. Click **Deploy**

**Every `git push` auto-deploys.** Takes ~30 seconds.

---

## Step 3 — Set up Supabase (if not done already)

1. Go to **https://supabase.com** → create a free project
2. **SQL Editor** → paste contents of `supabase/schema.sql` → Run
3. **Settings → API** → copy Project URL and anon key → paste into Vercel env vars

---

## Local development

```bash
# Copy the example env file
cp .env.local.example .env.local
# Fill in your Anthropic key and Supabase URL/key in .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## What gets deployed

| Route | Description |
|---|---|
| `/` | Redirect to home or onboarding |
| `/onboarding` | Sleep goal setup (first time) |
| `/auth` | Sign in / sign up |
| `/home` | Dashboard — score dial, streak, community preview |
| `/sleep/[id]` | Session detail — timeline, stats, signals |
| `/history` | All past sessions grouped by month |
| `/community` | Social feed with kudos |

## Environment variables reference

| Variable | Where to find |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | developer.spotify.com → Dashboard → your app (optional) |
