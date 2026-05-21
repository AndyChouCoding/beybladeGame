# Gyro Battle — 陀螺比賽轉播系統

A browser-based tournament management and live broadcast tool for spinning top (beyblade) competitions.

## Features

- **Tournament bracket** — single-elimination with automatic BYE seeding
- **Player management** — add, edit, delete, reorder (drag), bulk import/export
- **Live match screen** — countdown, scoreboard (best of 4), winner overlay
- **Gyro motion tracking** — real-time camera trail overlay using grid-based blob detection
- **Persistent state** — tournament data saved to localStorage across page refreshes

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Zustand 5 (with persist middleware)
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
