# MindFlow

A minimalist, keyboard-driven mind-map notebook built with **Next.js (App Router)**, **Tailwind CSS v4**, **React Flow (`@xyflow/react`)**, **Lucide** and **Supabase** (Auth + Postgres).

## Setup

1. **Requirements:** Node.js **≥ 20.19** (or ≥ 22.12).
2. **Create a Supabase project** at https://supabase.com.
3. **Create the table:** open *SQL Editor* and run [`supabase/schema.sql`](supabase/schema.sql). It creates `mind_maps` with Row Level Security, so each user can only see their own maps.
4. **Env vars:**
   ```bash
   cp .env.local.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
5. **Auth settings** (Supabase → Authentication):
   - *URL Configuration*: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the redirect URLs.
   - Optional: turn off **Confirm email** under *Providers → Email* if you want sign-up to log users in right away.
6. **Run:**
   ```bash
   npm install
   npm run dev
   ```

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing page (logged-in users get redirected to `/dashboard`) |
| `/login`, `/signup` | Email/password auth |
| `/auth/callback` | Email confirmation handler |
| `/dashboard` | Your maps: create, rename, delete (protected) |
| `/map/[id]` | Canvas editor (protected) |

Route protection lives in [`middleware.ts`](middleware.ts) → [`lib/supabase/middleware.ts`](lib/supabase/middleware.ts).

## Editor shortcuts

| Key | Action |
| --- | --- |
| `Enter` | New child node (starts editing it) |
| `Tab` | New sibling node (also works while editing) |
| `Backspace` / `Delete` | Delete the selected node and its subtree (the root can't be deleted) |
| `← ↑ ↓ →` | Move between connected nodes (←/→ go to parent/children, ↑/↓ go to siblings) |
| Click, `F2`, or just start typing | Edit the node's text |
| `Enter` / `Esc` while editing | Finish editing (`Shift+Enter` adds a new line) |

Changes auto-save to Supabase 1 second after your last edit. The status shows in the toolbar.
