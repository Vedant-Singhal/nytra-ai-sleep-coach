# Deploy to Vercel — Step by Step

## Prerequisites
- Node.js 18+ installed
- A Supabase project (same schema from `../sleep_tracker/supabase/schema.sql`)
- A GitHub account (for easiest Vercel deploy)

---

## Option A: Deploy via Vercel CLI (fastest — 2 commands)

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. In this folder
cd sleep_tracker_web
npm install
vercel
```

Vercel will prompt you to log in, then ask a few questions (accept defaults).
When asked for environment variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Your app is live.** Vercel gives you a URL like `https://sleep-tracker-abc123.vercel.app`.

---

## Option B: Deploy via GitHub (recommended for ongoing dev)

### Step 1 — Push to GitHub
```bash
cd sleep_tracker_web
git init
git add .
git commit -m "Initial sleep tracker web app"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/sleep-tracker-web.git
git push -u origin main
```

### Step 2 — Import on Vercel
1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select your `sleep-tracker-web` repo
4. Framework: **Next.js** (auto-detected)
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
6. Click **Deploy**

**Every `git push` auto-deploys.** Takes ~30 seconds.

---

## Step 3 — Set up Supabase (if not done already)

1. Go to **https://supabase.com** → create a free project
2. **SQL Editor** → paste contents of `../sleep_tracker/supabase/schema.sql` → Run
3. **Settings → API** → copy Project URL and anon key → paste into Vercel env vars

---

## Local development

```bash
# Copy the example env file
cp .env.local.example .env.local
# Fill in your Supabase URL and key in .env.local

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
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
