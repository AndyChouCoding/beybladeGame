# Changelog

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
