# WorkBoard v2

Fresh React + Supabase rebuild of WorkBoard.

## What is built in this first milestone

- Stable Supabase auth shell
- Role-aware navigation:
  - CEO: Board, Overview, Activity, People
  - Manager: Board, Overview, Activity, Team
  - Member: Board, Overview, Team
- Apporio-branded sidebar layout
- Mobile responsive drawer navigation
- Person-grouped kanban board
- Compact task cards
- Overview table with search/status filter
- Activity page foundation
- People/team page foundation
- Task detail side panel

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local`.

3. Fill in:

```bash
VITE_SUPABASE_URL=https://uvrypfufkivylnrnxegi.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Run locally:

```bash
npm run dev
```

5. Build for deployment:

```bash
npm run build
```

The built files will be in `dist/`.

## Notes

This is intentionally not feature-complete yet. The goal of this first milestone is a clean, stable foundation. Next milestones should add task create/edit, drag-and-drop, activity logging, mentions, notifications, and PWA support one layer at a time.

