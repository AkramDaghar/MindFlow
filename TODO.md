# MindFlow — Development Milestones

## Completed

### Foundation & Database
- [x] Next.js (App Router) + TypeScript + Tailwind CSS v4 + React Flow (`@xyflow/react`) + Lucide React setup (`package.json`)
- [x] Supabase SSR/browser clients and PostgreSQL schema with Row Level Security (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `supabase/schema.sql`)
- [x] Added `snap_grid` and `cover_image` columns + idempotent migration SQL (`supabase/schema.sql`)
- [x] Verified and applied the `alter table public.mind_maps` migration for `snap_grid` and `cover_image` in live Supabase SQL Editor

### Public Landing & Auth
- [x] Minimalist landing page (`/`) with hero, interactive mind-map preview, 3-column feature highlights, and bottom CTA (`app/page.tsx`, `components/landing/mind-map-preview.tsx`)
- [x] Email/password `/login` and `/signup` flows with Supabase Auth (`app/auth/actions.ts`, `components/auth-form.tsx`)
- [x] Route protection redirecting unauthenticated users from `/dashboard` and `/map/[id]` to `/login` (`middleware.ts`, `lib/supabase/middleware.ts`)

### Dashboard (`/dashboard`)
- [x] Header with user email/avatar, theme toggle, and Log Out (`components/dashboard/header.tsx`)
- [x] `+ New Mind Map` creation card and user-scoped map grid (`app/dashboard/page.tsx`, `app/dashboard/actions.ts`, `components/dashboard/map-grid.tsx`)
- [x] Settings icon on card hover opening `MapSettingsModal` with Rename, Picture upload + 2:1 crop/position (`components/dashboard/image-cropper.tsx`), Snap Grid toggle, and Delete with confirmation (`components/map-settings-modal.tsx`)

### Mind Map Canvas Editor (`/map/[id]`)
- [x] Infinite pannable/zoomable canvas with central root node (`components/editor/mind-map-editor.tsx`)
- [x] Keyboard-driven workflow: `Enter` (child), `Tab` (sibling), `Backspace`/`Delete` (remove node/subtree), arrow-key navigation, `F2`/click/type to edit
- [x] Constrained node width (`300px` max) with mirror-based auto-sizing so edit width matches displayed text (`components/editor/mind-node.tsx`)
- [x] Selectable and deletable edges with anti-orphan guard (`components/editor/mind-map-editor.tsx`, `app/globals.css`)
- [x] Invisible `20×20px` snap grid controlled per map via `snap_grid` (`lib/mindmap.ts`, `components/editor/mind-map-editor.tsx`)
- [x] Undo history (`Ctrl+Z` + top-bar Undo button)
- [x] Floating `NodeToolbar` popup on node selection with Palette color picker (`White`, `Black`, `Blue`, `Green`, `Amber`, `Rose`, `Violet` with translucent fills and solid borders) (`lib/types.ts`, `components/editor/mind-node.tsx`)
- [x] Top toolbar with auto-fitting title, save status indicator, Undo, Zoom/Fit controls, Markdown/JSON export, Dark/Light toggle, `?` Keyboard Shortcuts popover, and Map Settings modal (`components/editor/toolbar.tsx`)
- [x] 1-second debounced auto-save to Supabase
- [x] File preview when a file is clicked in a node
- [x] File upload feature (uploading files into mind maps / nodes)
- [x] Fixed node selection
- [x] Fixed "Not Saved" UI alignment
- [x] Fixed Next.js error

---

## Up Next (Pending)

### QA, Git & Auth
- [ ] **Browser QA pass:** Reload `/map/[id]` and verify the updated node color swatches (`White`, `Black`, higher-opacity colored fills) and the top-bar `?` keyboard shortcuts popover
- [ ] **Git commit & push:** Review, commit, and push the current uncommitted changes on `main` to `origin` (`https://github.com/AkramDaghar/MindFlow`, currently at `fee2c93`)
- [ ] **Email confirmation flow:** Re-enable email confirmation in Supabase Auth when ready and harden `/auth/callback` (`token_hash` / cross-browser link handling)

### New Features & Launch
- [ ] **Drag-to-create node:** Add node creation when an arrow/line is dragged out of an existing node at the drop position
- [ ] **Collaboration & share link:** Add real-time collaboration and shareable map links
- [ ] **Live multi-cursor pointers:** Display multiple collaborator pointers moving in real time when multiple users open the same mind map
- [ ] **Update hero page:** Modify the landing/hero page (`app/page.tsx`) to reflect the new features (file uploads, collaboration, etc.)
- [ ] **Todo list feature:** Add a todo list feature
- [ ] **Tabs for mind maps:** Add "tabs" where you can open multiple mind maps in each one
- [ ] **Account & profile management:** Add account and profile management
- [ ] **Competitor analysis:** Do competitor analysis
- [ ] **Launch on GitHub Pages:** Prepare static build/hosting setup and publish the product on GitHub Pages

---

## Backlog (Future Ideas)

- [ ] Redo support (`Ctrl+Shift+Z` / `Ctrl+Y`)
- [ ] Unit & E2E tests (e.g., `lib/mindmap.ts` helpers, auth guards, editor shortcuts)
- [ ] Production deployment and live Supabase Auth redirect URL configuration
