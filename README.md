# Gyro Battle — 陀螺比賽轉播系統

A browser-based tournament management and live broadcast tool for spinning top (beyblade) competitions.

## Features

- **Tournament bracket** — single-elimination with automatic BYE seeding
- **3rd/4th place playoff** — semifinal losers play a decider before the final unlocks, with an explicit confirm step when a semifinal was a walkover
- **Podium results screen** — 冠軍/亞軍/季軍 shown side by side once the final is complete
- **Player management** — add, edit, delete, reorder (drag), bulk import/export, Google Sheet import (names + photos, with an optional default photo fallback)
- **Live match screen** — scoreboard (best of 4), winner overlay
- **Persistent state** — tournament data saved to localStorage across page refreshes

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Zustand 5 (with persist middleware)
- PapaParse for CSV/Google Sheet import
- Tailwind CSS 4
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Flow

```
Setup → Players → Bracket → Match (repeats) → Champion (podium)
```

Once both semifinals are done, a 3rd/4th place match is added to the Bracket screen; the
final stays locked until it's resolved. The Champion screen then shows the full podium
(冠軍/亞軍/季軍).

From the Bracket screen you can return to Players at any time to edit the roster before
regenerating the bracket.
