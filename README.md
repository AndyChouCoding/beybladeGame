# Gyro Battle — 陀螺比賽轉播系統

A browser-based tournament management and live broadcast tool for spinning top (beyblade) competitions.

## Features

- **Tournament bracket** — single-elimination with automatic BYE seeding
- **Player management** — add, edit, delete, reorder (drag), bulk import/export, Google Sheet import (names + photos, with an optional default photo fallback)
- **Live match screen** — scoreboard (best of 4), winner overlay
- **Gyro motion tracking** — real-time dual-gyro trajectory overlay (three.js light-trail effect) using grid-based blob detection
- **Persistent state** — tournament data saved to localStorage across page refreshes

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Zustand 5 (with persist middleware)
- Three.js (`@react-three/fiber` + `@react-three/drei`) for the trajectory overlay
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
Setup → Players → Bracket → Match → Champion
```

From the Bracket screen you can return to Players at any time to edit the roster before regenerating the bracket.
