'use client'
import { useRef, useEffect, useState } from 'react'

interface Props {
  countdownOverlay: string | null
}

export default function CameraView({ countdownOverlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
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

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl">
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
