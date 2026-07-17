# Changelog

## [Unreleased]

## [v1.4.1] - 2026-07-17
### Removed
- Trajectory overlay is disabled (screen-only) — the two-gyro trails from v1.4.0 proved
  unreliable in live use. `CameraView` no longer renders `TrajectoryOverlay`; the detection
  loop and `gyroTracker.ts`/`TrajectoryOverlay.tsx` are left in place for future rework.

## [v1.4.0] - 2026-07-06

### Added
- Gyro trajectory overlay is back, rebuilt on three.js (via `@react-three/fiber` +
  `@react-three/drei`) instead of the old canvas-2D version, and now tracks **both** gyros
  at once instead of one.
  - Detection (`utils/gyroTracker.ts`) buckets frame-to-frame motion within a centered ROI
    (70% of the frame, filtering out crowd/hand motion near the arena edges) into a coarse
    grid, then picks the two densest, sufficiently-separated peaks as the two gyros. No
    manual setup/calibration step needed.
    - Each peak is EMA-smoothed independently with large-jump damping for stability.
    - Frame-to-frame identity (which trail is which gyro) is preserved by nearest-neighbor
      matching against the previous frame's positions, so the two trails don't swap or
      flicker when the gyros' paths cross.
  - `components/match/TrajectoryOverlay.tsx` renders two independently-colored streaks
    (amber + cyan) over the live video via a pixel-mapped orthographic R3F canvas, styled
    after a lens-flare light-trail look (ref: HelloEnjoy's "Lights" three.js experience):
    a sparkle/starburst head (8-point radiating glow sprite) trailing a thin, near
    constant-width bright core streak plus a wider, dimmer halo streak behind it — both
    built on drei `<Trail>` with their underlying `MeshLineMaterial` patched to additive
    blending + a canvas-generated alpha gradient, so they dissipate into transparency
    toward the tail rather than tapering to a point or staying flat-opacity.
  - Tracker resets fresh at the start of every match; detection only runs during the
    `active` phase.
- Google Sheet import for player rosters, alongside the existing plain-text importer.
  - `PlayersScreen`'s import panel gains a mode toggle: "貼上名單" (existing) and "Google
    Sheet" (new) — paste a Sheet's "Publish to web" CSV link; A column = name, B column =
    photo URL (optional).
  - Parsed with `papaparse`; rows are read straight into the roster via a new
    `importPlayersFromSheet` store action.
  - Photo URLs from the sheet are stored and used as-is (no download/re-encoding), matching
    how the app already treats externally-sourced links.
  - Optional default-image picker in the same panel (uploaded from device, converted to a
    data URL like the existing avatar upload flow) — applied only to rows whose photo URL
    cell is empty; if no default is set, those rows are left without a photo as before.

### Removed
- The pre-match 3-2-1 / GO SHOOT countdown. Pressing "比賽開始" now goes straight into the
  active scoring phase.

## [v1.3.0] - 2026-05-29

### Added
- Multi-tournament tab bar: run multiple simultaneous tournaments side-by-side in one session.
  - A horizontal tab strip is pinned above all screens; each tab shows a phase-colour dot
    (gray=setup, blue=players, amber=bracket, green=match, gold=champion) and the tournament name.
  - "+ 新增組別" button opens a dropdown with two options:
    - **全新組別** — creates a fresh tournament (setup phase).
    - **混合組…** — opens a modal to name the group and cherry-pick players from any existing
      tournament; the new tab opens directly at the players screen with the chosen roster.
  - × close button on each tab deletes that tournament (disabled when only one tab remains).
  - Switching tabs snapshots the current tournament state, then restores the target — all tabs
    persist across page reloads via `gyro-battle-store-v2` in localStorage.
- `TournamentState` type added to `types/index.ts`.
- `createTournament`, `createMixedTournament`, `switchTournament`, `deleteTournament` actions
  added to `tournamentStore`; all existing actions unchanged.
- MatchScreen outer wrapper changed from `h-screen` to `h-full` so it fills the remaining
  viewport height correctly when the tab bar is present.

### Fixed
- Move add-tab dropdown outside the `overflow-x` scroll container so it renders without clipping.
- Show disabled state on `btn-primary` when the form is invalid and display a hint on the empty
  tournament name field in the mixed-group modal.

## [v1.2.1] - 2026-05-27

### Fixed
- SetupScreen player-count input: changing `count` state from `number` to `string` so the
  field can be freely cleared/retyped. Previously `parseInt('') || 2` forced the value back
  to 2 on every keystroke, making it impossible to delete the current number.
  An inline error message now appears for out-of-range values, and `onBlur` clamps/resets
  the field to a valid value. The submit button is disabled while the count is invalid.

## [v1.2.0] - 2026-05-27

### Changed
- Removed camera trajectory overlay (motion-detection canvas + EMA trail) from CameraView;
  the camera now shows a clean live feed only.
- MatchScreen layout is now responsive:
  - Mobile (< 768 px): flex-col — camera fills top area, phase-control bar, scoreboard as
    a horizontal strip at the bottom with the two players side-by-side.
  - Desktop (≥ 768 px): flex-row — camera on the left (flex-1), scoreboard on the right
    (32 % width) as a vertical panel; phase-control button below the camera.
- Scoreboard switches between horizontal (mobile) and vertical (desktop) layout using
  responsive Tailwind classes; score dots and font sizes scale down on mobile.

## [v1.1.0] - 2026-05-27

### Added
- Auto-populate player names (Player 1 … Player N) when entering the Players screen from Setup
- `Player.photoUrl` field for storing per-player avatar images
- `setPlayerPhoto` store action — syncs photo across players list, bracket, and champion state
- `PlayerAvatar` component: circular avatar showing photo or coloured initial letter
- Photo upload (📁) and live camera capture (📷) per player in PlayersScreen
- Player avatars displayed in: PlayersScreen roster, Match scoreboard panels, Bracket match cards, Champion reveal screen
- `utils/image.ts`: canvas-based image resize (200 px / JPEG 0.75) to keep localStorage footprint small
- "全部清除" button in PlayersScreen — clears the entire roster after inline confirmation
- Players now persist across tournaments; reset/new-tournament no longer wipes the player list
- SetupScreen shows "已有 N 位選手，將直接沿用" hint when a saved roster exists
- `clearPlayers` store action for explicit roster wipe

### Fixed
- Bracket BYE seeding: players with a first-round BYE no longer skip directly to the final.
  `propagateByes` now only auto-completes a match when BOTH its feeding matches are already
  resolved, preventing "unfilled pending slots" from being mistaken for permanent BYEs.
- `completeMatch` store action now propagates winners through consecutive BYE slots during
  live play (e.g. 6-player bracket where one semi-final has a null opponent).
- Camera trajectory detection: trail was cramped in one area and misaligned with the actual
  gyro position. Root cause was that `drawImage` captured the full video frame (including
  regions cropped out by CSS `object-cover`) while the overlay canvas only displayed the
  visible portion — creating a coordinate mismatch. Now the process canvas samples only the
  visible video rectangle, so detected positions correctly align with what is shown on screen.
- Tuned motion detection parameters: `MIN_PEAK_COUNT` 6→15 (reduce noise), `NEIGHBORHOOD` 2→1
  (more precise centroid), `EMA_ALPHA` 0.38→0.55 (more responsive tracking), `MAX_JUMP_DIST`
  0.28→0.40 (allow genuine fast moves), large-jump damping factor 0.25→0.5 (less suppression).

## [v1.0.0] - 2026-05-21

### Added
- Tournament setup screen (name + player count)
- Player entry screen with auto BYE padding for non-power-of-2 counts
- Single-elimination bracket view with SVG connector lines
- Match screen with 3-2-1-GO countdown and real-time scoreboard (best of 4)
- Camera-based gyro motion tracking with golden trail overlay
- Champion screen displayed after final match
- Zustand store with localStorage persistence
- Player management system: inline name editing, drag-to-reorder, add/delete, bulk import/export
- Manage Players button in bracket screen to return and edit roster
- Inline player name editing modal during live match
- Grid-based blob detection for stable gyro tracking (replaces noisy full-frame centroid)
- EMA smoothing and jump damping on tracking position
