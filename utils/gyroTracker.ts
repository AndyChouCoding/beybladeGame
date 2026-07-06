// Pure detection logic for the gyro trajectory overlay — no React/three.js here.
//
// Pipeline: every frame is diffed against the previous one inside a centered ROI (the
// competition arena is assumed to be roughly centered in the camera frame, filtering out
// background motion from the crowd/hands near the edges). Motion pixels are bucketed into a
// coarse grid; the two densest, sufficiently-separated peaks are treated as the two gyros.
// Each peak is EMA-smoothed independently, and identity (which physical gyro maps to which
// returned slot) is preserved frame-to-frame by nearest-neighbor matching against the
// previous frame's smoothed positions — otherwise the two trails would swap/flicker
// whenever the relative motion-density ranking of the two gyros flips.

export interface NormalizedPoint {
  x: number
  y: number
}

export const PROCESS_W = 160
export const PROCESS_H = 120

const ROI_FRACTION = 0.7 // centered box covering this fraction of width/height
const MOTION_THRESHOLD = 28 // per-pixel summed RGB diff to count as "moving"

const GRID_COLS = 16
const GRID_ROWS = 12
const NEIGHBORHOOD = 1 // aggregate (2*N+1)² cells around each peak for its centroid
const MIN_PEAK_COUNT = 10 // minimum motion pixels for a valid peak
const MIN_PEAK_SEPARATION = 3 // grid cells; candidates closer to peak 1 than this are assumed to be the same blob

const EMA_ALPHA = 0.5
const MAX_JUMP_DIST = 0.4 // fraction of frame width; beyond this a jump gets damped
const JUMP_DAMP_FACTOR = 0.5

function roiBounds(width: number, height: number) {
  const w = width * ROI_FRACTION
  const h = height * ROI_FRACTION
  return {
    x0: Math.round((width - w) / 2),
    y0: Math.round((height - h) / 2),
    x1: Math.round((width + w) / 2),
    y1: Math.round((height + h) / 2),
  }
}

function dist(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// EMA-smooths a single tracked point; holds its last position when detection momentarily
// fails for a frame instead of snapping to null (e.g. a gyro that's stopped spinning).
class PointSmoother {
  private smoothed: NormalizedPoint | null = null

  get current(): NormalizedPoint | null {
    return this.smoothed
  }

  reset(): void {
    this.smoothed = null
  }

  update(raw: NormalizedPoint | null): NormalizedPoint | null {
    if (!raw) return this.smoothed
    if (!this.smoothed) {
      this.smoothed = raw
      return this.smoothed
    }
    const dx = raw.x - this.smoothed.x
    const dy = raw.y - this.smoothed.y
    const jumpDist = Math.hypot(dx, dy)
    const damp = jumpDist > MAX_JUMP_DIST ? JUMP_DAMP_FACTOR : 1
    this.smoothed = {
      x: this.smoothed.x + dx * EMA_ALPHA * damp,
      y: this.smoothed.y + dy * EMA_ALPHA * damp,
    }
    return this.smoothed
  }
}

export class GyroTracker {
  private prevFrame: ImageData | null = null
  private slots: [PointSmoother, PointSmoother] = [new PointSmoother(), new PointSmoother()]

  reset(): void {
    this.prevFrame = null
    this.slots[0].reset()
    this.slots[1].reset()
  }

  /** Diffs against the previous frame within the ROI and tracks up to two motion peaks. */
  detect(frame: ImageData): [NormalizedPoint | null, NormalizedPoint | null] {
    const prev = this.prevFrame
    this.prevFrame = frame
    if (!prev) return [this.slots[0].current, this.slots[1].current]

    const { data, width, height } = frame
    const prevData = prev.data
    const { x0, y0, x1, y1 } = roiBounds(width, height)

    const cellW = (x1 - x0) / GRID_COLS
    const cellH = (y1 - y0) / GRID_ROWS
    const gridCount = new Int32Array(GRID_ROWS * GRID_COLS)
    const gridSumX = new Float32Array(GRID_ROWS * GRID_COLS)
    const gridSumY = new Float32Array(GRID_ROWS * GRID_COLS)

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4
        const diff =
          Math.abs(data[i] - prevData[i]) +
          Math.abs(data[i + 1] - prevData[i + 1]) +
          Math.abs(data[i + 2] - prevData[i + 2])
        if (diff > MOTION_THRESHOLD) {
          const col = Math.min(((x - x0) / cellW) | 0, GRID_COLS - 1)
          const row = Math.min(((y - y0) / cellH) | 0, GRID_ROWS - 1)
          const gi = row * GRID_COLS + col
          gridCount[gi]++
          gridSumX[gi] += x
          gridSumY[gi] += y
        }
      }
    }

    let peak1Gi = -1
    let peak1Count = 0
    for (let gi = 0; gi < gridCount.length; gi++) {
      if (gridCount[gi] > peak1Count) {
        peak1Count = gridCount[gi]
        peak1Gi = gi
      }
    }

    let peak2Gi = -1
    let peak2Count = 0
    if (peak1Gi >= 0) {
      const p1Row = (peak1Gi / GRID_COLS) | 0
      const p1Col = peak1Gi % GRID_COLS
      for (let gi = 0; gi < gridCount.length; gi++) {
        if (gridCount[gi] <= peak2Count) continue
        const row = (gi / GRID_COLS) | 0
        const col = gi % GRID_COLS
        if (Math.hypot(row - p1Row, col - p1Col) < MIN_PEAK_SEPARATION) continue
        peak2Count = gridCount[gi]
        peak2Gi = gi
      }
    }

    const aggregate = (peakGi: number, peakCount: number): NormalizedPoint | null => {
      if (peakGi < 0 || peakCount < MIN_PEAK_COUNT) return null
      const pRow = (peakGi / GRID_COLS) | 0
      const pCol = peakGi % GRID_COLS
      let sumX = 0
      let sumY = 0
      let count = 0
      const r0 = Math.max(0, pRow - NEIGHBORHOOD)
      const r1 = Math.min(GRID_ROWS - 1, pRow + NEIGHBORHOOD)
      const c0 = Math.max(0, pCol - NEIGHBORHOOD)
      const c1 = Math.min(GRID_COLS - 1, pCol + NEIGHBORHOOD)
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const gi = r * GRID_COLS + c
          sumX += gridSumX[gi]
          sumY += gridSumY[gi]
          count += gridCount[gi]
        }
      }
      if (count < MIN_PEAK_COUNT) return null
      return { x: sumX / count / width, y: sumY / count / height }
    }

    const raw1 = aggregate(peak1Gi, peak1Count)
    const raw2 = aggregate(peak2Gi, peak2Count)

    const [a, b] = this.assignToSlots(raw1, raw2)
    return [this.slots[0].update(a), this.slots[1].update(b)]
  }

  /** Matches this frame's raw detections to the two tracking slots by nearest neighbor, so trail identity doesn't flicker/swap between frames. */
  private assignToSlots(
    raw1: NormalizedPoint | null,
    raw2: NormalizedPoint | null
  ): [NormalizedPoint | null, NormalizedPoint | null] {
    const candidates = [raw1, raw2].filter((p): p is NormalizedPoint => p !== null)
    if (candidates.length === 0) return [null, null]

    const c0 = this.slots[0].current
    const c1 = this.slots[1].current

    if (candidates.length === 1) {
      const p = candidates[0]
      if (!c0 && !c1) return [p, null]
      const d0 = c0 ? dist(p, c0) : Infinity
      const d1 = c1 ? dist(p, c1) : Infinity
      return d0 <= d1 ? [p, null] : [null, p]
    }

    const [p1, p2] = candidates
    if (!c0 && !c1) return [p1, p2]

    const costKeepOrder = (c0 ? dist(p1, c0) : 0) + (c1 ? dist(p2, c1) : 0)
    const costSwapOrder = (c0 ? dist(p2, c0) : 0) + (c1 ? dist(p1, c1) : 0)
    return costKeepOrder <= costSwapOrder ? [p1, p2] : [p2, p1]
  }
}
