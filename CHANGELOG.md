# Changelog

## [Unreleased]

### Added
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

### Added
- Auto-populate player names (Player 1 … Player N) when entering the Players screen from Setup
- `Player.photoUrl` field for storing per-player avatar images
- `setPlayerPhoto` store action — syncs photo across players list, bracket, and champion state
- `PlayerAvatar` component: circular avatar showing photo or coloured initial letter
- Photo upload (📁) and live camera capture (📷) per player in PlayersScreen
- Player avatars displayed in: PlayersScreen roster, Match scoreboard panels, Bracket match cards, Champion reveal screen
- `utils/image.ts`: canvas-based image resize (200 px / JPEG 0.75) to keep localStorage footprint small

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
