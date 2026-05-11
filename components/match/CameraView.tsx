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
const MOTION_THRESHOLD = 35
const MIN_MOTION_PIXELS = 40
const TRAIL_DURATION_MS = 3000

export default function CameraView({ isTracking, countdownOverlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const processRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef<Position[]>([])
  const prevFrameRef = useRef<ImageData | null>(null)
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
      let sumX = 0, sumY = 0, count = 0

      for (let i = 0; i < curr.length; i += 4) {
        const diff =
          Math.abs(curr[i] - prev[i]) +
          Math.abs(curr[i + 1] - prev[i + 1]) +
          Math.abs(curr[i + 2] - prev[i + 2])
        if (diff > MOTION_THRESHOLD) {
          const idx = i / 4
          sumX += idx % PROCESS_W
          sumY += Math.floor(idx / PROCESS_W)
          count++
        }
      }

      if (count >= MIN_MOTION_PIXELS) {
        positionsRef.current.push({
          x: sumX / count / PROCESS_W,
          y: sumY / count / PROCESS_H,
          t: Date.now(),
        })
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
      rafRef.current = requestAnimationFrame(drawTrail)
    } else {
      cancelAnimationFrame(rafRef.current)
      positionsRef.current = []
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
