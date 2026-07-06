'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import TrajectoryOverlay from './TrajectoryOverlay'
import { GyroTracker, PROCESS_W, PROCESS_H, NormalizedPoint } from '@/utils/gyroTracker'

interface Props {
  countdownOverlay: string | null
  active: boolean
}

export default function CameraView({ countdownOverlay, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const processRef = useRef<HTMLCanvasElement>(null)
  const trackerRef = useRef(new GyroTracker())
  const targetsRef = useRef<[NormalizedPoint | null, NormalizedPoint | null]>([null, null])
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

  // A fresh tracker is needed each time a match goes active — no leftover previous-frame
  // state or smoothed position should carry over from the last match.
  useEffect(() => {
    if (active) {
      trackerRef.current.reset()
      targetsRef.current = [null, null]
    }
  }, [active])

  // Draws the visible (object-cover-cropped) portion of the current video frame into the
  // downsampled processing canvas used for motion detection.
  const captureFrame = useCallback((): CanvasRenderingContext2D | null => {
    const video = videoRef.current
    const process = processRef.current
    const container = containerRef.current
    if (!video || !process || !container || video.readyState < 2) return null

    const ctx = process.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    const cW = container.clientWidth
    const cH = container.clientHeight
    const vW = video.videoWidth || 1280
    const vH = video.videoHeight || 720
    const coverScale = Math.max(cW / vW, cH / vH)
    const srcW = cW / coverScale
    const srcH = cH / coverScale
    const srcX = (vW - srcW) / 2
    const srcY = (vH - srcH) / 2

    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, PROCESS_W, PROCESS_H)
    return ctx
  }, [])

  // Continuous detection loop — only runs while a match is actively being scored.
  useEffect(() => {
    if (!active) return
    let raf = 0
    const tick = () => {
      const ctx = captureFrame()
      if (ctx) {
        const frame = ctx.getImageData(0, 0, PROCESS_W, PROCESS_H)
        targetsRef.current = trackerRef.current.detect(frame)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, captureFrame])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden rounded-xl"
    >
      {cameraError ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-red-400 text-sm text-center px-4">{cameraError}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      )}

      {/* Hidden downsampled canvas used for motion detection — never rendered to the user */}
      <canvas ref={processRef} width={PROCESS_W} height={PROCESS_H} className="hidden" />

      <TrajectoryOverlay targetsRef={targetsRef} active={active} />

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
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
