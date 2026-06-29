# Reader OS

A reading identity platform. Every choice reveals who you are.

## Load in StackBlitz (no local machine needed)

1. Upload this entire folder to GitHub:
   - Go to github.com → New repository → name: `reader-os`
   - Click "uploading an existing file"
   - Drag all files in → Commit

2. Open in StackBlitz:
   ```
   https://stackblitz.com/github/YOUR_USERNAME/reader-os
   ```

3. Add secrets in StackBlitz (lock icon 🔒 in left sidebar):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ANTHROPIC_API_KEY
   ```

4. StackBlitz runs `npm install && npm run dev` automatically.

## Supabase Setup (do this first)

1. Create project at supabase.com
2. Go to SQL Editor → paste contents of `supabase-setup.sql` → Run
3. Go to Project Settings → API → copy your keys

## Run AI Pipeline (from browser)

Once the app is running:
1. Go to `/admin` in your app
2. Select a genre, click "Run Pipeline"
3. Books are generated from Open Library → AI structures them
4. Click "Publish all books" → books appear in library

## Architecture

```
User → Sign up → 5 onboarding questions → Archetype reveal
     → Select book from Library
     → Daily reading session (10 min)
     → Scene prose → Choice panel → Identity update
     → Streak continues
```

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
- **Auth + DB**: Supabase (replaces Clerk + Neon)
- **AI**: Anthropic Claude (story pipeline)
- **Books**: Open Library API (free, no key needed)
- **Analytics**: PostHog
