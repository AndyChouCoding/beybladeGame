'use client'
import { useRef, useEffect, useCallback, useState } from 'react'

interface Position {
  x: number
  y: number
  t: number
}

interface Props {
  isTracking: boolean
  countdownOverlay: string | null
}

const PROCESS_W = 160
const PROCESS_H = 120
const MOTION_THRESHOLD = 28
const TRAIL_DURATION_MS = 3000

// Grid-based blob detection: find the densest motion cell instead of averaging all motion pixels
const GRID_COLS = 16
const GRID_ROWS = 12
const CELL_W = PROCESS_W / GRID_COLS   // 10px per cell
const CELL_H = PROCESS_H / GRID_ROWS   // 10px per cell
const MIN_PEAK_COUNT = 6               // minimum motion pixels for a valid detection
const NEIGHBORHOOD = 2                 // aggregate (2*N+1)² cells around peak

// EMA smoothing
const EMA_ALPHA = 0.38
const MAX_JUMP_DIST = 0.28             // fraction of screen; beyond this, dampen the jump

export default function CameraView({ isTracking, countdownOverlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const processRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef<Position[]>([])
  const prevFrameRef = useRef<ImageData | null>(null)
  const smoothedPosRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number>(0)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } })
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((s) => {
            stream = s
            if (videoRef.current) videoRef.current.srcObject = s
          })
          .catch(() => setCameraError('無法存取攝影機，請確認權限設定'))
      })
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const drawTrail = useCallback(() => {
    const overlay = overlayRef.current
    const process = processRef.current
    const video = videoRef.current
    if (!overlay || !process || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(drawTrail)
      return
    }

    const processCtx = process.getContext('2d', { willReadFrequently: true })
    const overlayCtx = overlay.getContext('2d')
    if (!processCtx || !overlayCtx) {
      rafRef.current = requestAnimationFrame(drawTrail)
      return
    }

    processCtx.drawImage(video, 0, 0, PROCESS_W, PROCESS_H)
    const currentFrame = processCtx.getImageData(0, 0, PROCESS_W, PROCESS_H)

    if (prevFrameRef.current) {
      const prev = prevFrameRef.current.data
      const curr = currentFrame.data

      // Build motion density grid
      const gridCount = new Int32Array(GRID_ROWS * GRID_COLS)
      const gridSumX = new Float32Array(GRID_ROWS * GRID_COLS)
      const gridSumY = new Float32Array(GRID_ROWS * GRID_COLS)

      for (let i = 0; i < curr.length; i += 4) {
        const diff =
          Math.abs(curr[i] - prev[i]) +
          Math.abs(curr[i + 1] - prev[i + 1]) +
          Math.abs(curr[i + 2] - prev[i + 2])
        if (diff > MOTION_THRESHOLD) {
          const idx = i >> 2
          const px = idx % PROCESS_W
          const py = (idx / PROCESS_W) | 0
          const col = Math.min((px / CELL_W) | 0, GRID_COLS - 1)
          const row = Math.min((py / CELL_H) | 0, GRID_ROWS - 1)
          const gi = row * GRID_COLS + col
          gridCount[gi]++
          gridSumX[gi] += px
          gridSumY[gi] += py
        }
      }

      // Find the peak cell (densest motion)
      let peakGi = 0
      let peakCount = 0
      for (let gi = 0; gi < gridCount.length; gi++) {
        if (gridCount[gi] > peakCount) {
          peakCount = gridCount[gi]
          peakGi = gi
        }
      }

      if (peakCount >= MIN_PEAK_COUNT) {
        const peakRow = (peakGi / GRID_COLS) | 0
        const peakCol = peakGi % GRID_COLS

        // Aggregate centroid within the neighborhood of the peak cell
        let sumX = 0, sumY = 0, count = 0
        const r0 = Math.max(0, peakRow - NEIGHBORHOOD)
        const r1 = Math.min(GRID_ROWS - 1, peakRow + NEIGHBORHOOD)
        const c0 = Math.max(0, peakCol - NEIGHBORHOOD)
        const c1 = Math.min(GRID_COLS - 1, peakCol + NEIGHBORHOOD)

        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const gi = r * GRID_COLS + c
            sumX += gridSumX[gi]
            sumY += gridSumY[gi]
            count += gridCount[gi]
          }
        }

        if (count > 0) {
          const rawX = sumX / count / PROCESS_W
          const rawY = sumY / count / PROCESS_H

          let sx: number, sy: number
          const prev = smoothedPosRef.current
          if (prev === null) {
            sx = rawX
            sy = rawY
          } else {
            const dx = rawX - prev.x
            const dy = rawY - prev.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            // Dampen large jumps — likely noise or hand interference
            const alpha = dist > MAX_JUMP_DIST ? EMA_ALPHA * 0.25 : EMA_ALPHA
            sx = alpha * rawX + (1 - alpha) * prev.x
            sy = alpha * rawY + (1 - alpha) * prev.y
          }

          smoothedPosRef.current = { x: sx, y: sy }
          positionsRef.current.push({ x: sx, y: sy, t: Date.now() })
        }
      }
    }

    prevFrameRef.current = currentFrame

    const cutoff = Date.now() - TRAIL_DURATION_MS
    positionsRef.current = positionsRef.current.filter((p) => p.t > cutoff)

    overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
    const positions = positionsRef.current
    const W = overlay.width
    const H = overlay.height

    if (positions.length > 1) {
      for (let i = 1; i < positions.length; i++) {
        const progress = i / positions.length
        const alpha = 0.15 + 0.85 * progress
        const width = 1.5 + 4 * progress
        overlayCtx.beginPath()
        overlayCtx.strokeStyle = `rgba(251,191,36,${alpha})`
        overlayCtx.lineWidth = width
        overlayCtx.lineCap = 'round'
        overlayCtx.moveTo(positions[i - 1].x * W, positions[i - 1].y * H)
        overlayCtx.lineTo(positions[i].x * W, positions[i].y * H)
        overlayCtx.stroke()
      }
      const last = positions[positions.length - 1]
      overlayCtx.beginPath()
      overlayCtx.fillStyle = 'rgba(239,68,68,0.9)'
      overlayCtx.arc(last.x * W, last.y * H, 7, 0, Math.PI * 2)
      overlayCtx.fill()
      overlayCtx.beginPath()
      overlayCtx.fillStyle = 'rgba(255,255,255,0.8)'
      overlayCtx.arc(last.x * W, last.y * H, 3, 0, Math.PI * 2)
      overlayCtx.fill()
    }

    rafRef.current = requestAnimationFrame(drawTrail)
  }, [])

  useEffect(() => {
    if (isTracking) {
      positionsRef.current = []
      prevFrameRef.current = null
      smoothedPosRef.current = null
      rafRef.current = requestAnimationFrame(drawTrail)
    } else {
      cancelAnimationFrame(rafRef.current)
      positionsRef.current = []
      smoothedPosRef.current = null
      const overlay = overlayRef.current
      if (overlay) {
        const ctx = overlay.getContext('2d')
        ctx?.clearRect(0, 0, overlay.width, overlay.height)
      }
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isTracking, drawTrail])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl">
      {cameraError ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-red-400 text-sm text-center px-4">{cameraError}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            width={1280}
            height={720}
          />
          <canvas ref={processRef} className="hidden" width={PROCESS_W} height={PROCESS_H} />
        </>
      )}

      {countdownOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span
            className="font-black select-none"
            style={{
              fontSize: countdownOverlay === 'GO SHOOT' ? '6vw' : '12vw',
              color: countdownOverlay === 'GO SHOOT' ? '#f59e0b' : '#ffffff',
              textShadow: '0 4px 24px rgba(0,0,0,0.8)',
              letterSpacing: countdownOverlay === 'GO SHOOT' ? '0.05em' : 'normal',
              animation: 'pulse 0.4s ease-out',
            }}
          >
            {countdownOverlay}
          </span>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          from { transform: scale(1.3); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
