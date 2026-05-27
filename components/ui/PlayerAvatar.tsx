'use client'
import { useRef, useState } from 'react'
import { Player } from '@/types'
import { resizeImageToDataURL } from '@/utils/image'

const PALETTE = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
]

function pickColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % PALETTE.length
  return PALETTE[hash]
}

interface Props {
  player: Player
  /** Diameter in pixels */
  size?: number
  /** Show edit overlay and open upload/camera menu on click */
  editable?: boolean
  onPhotoChange?: (photoUrl: string) => void
}

export default function PlayerAvatar({ player, size = 32, editable = false, onPhotoChange }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const url = await resizeImageToDataURL(file, 200, 0.75)
      onPhotoChange?.(url)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
      setShowMenu(false)
      e.target.value = ''
    }
  }

  const initial = (player.name[0] || '?').toUpperCase()
  const bg = pickColor(player.name)
  const fontSize = Math.round(size * 0.42)

  const circle = (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? `設定 ${player.name} 的照片` : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: editable ? 'pointer' : 'default',
        border: '2px solid rgba(255,255,255,0.08)',
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={(e) => {
        if (!editable) return
        e.stopPropagation()
        setShowMenu((v) => !v)
      }}
      onKeyDown={(e) => {
        if (!editable) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowMenu((v) => !v)
        }
      }}
    >
      {loading ? (
        <span style={{ fontSize: fontSize * 0.7, color: '#0f0f1a' }}>⏳</span>
      ) : player.photoUrl ? (
        <img
          src={player.photoUrl}
          alt={player.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ color: '#0f0f1a', fontWeight: 800, fontSize, lineHeight: 1 }}>
          {initial}
        </span>
      )}

      {editable && !loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
          className="avatar-edit-overlay"
        >
          <span style={{ fontSize: Math.round(size * 0.32), color: '#fff' }}>✏</span>
        </div>
      )}
    </div>
  )

  if (!editable) return circle

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <style>{`
        [data-avatar-wrap]:hover .avatar-edit-overlay { opacity: 1 !important; }
      `}</style>
      <div data-avatar-wrap="">
        {circle}
      </div>

      {showMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              zIndex: 50,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              overflow: 'hidden',
              minWidth: 110,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#cbd5e1',
                fontSize: 12,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              onClick={() => { setShowMenu(false); uploadRef.current?.click() }}
            >
              📁 上傳照片
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#cbd5e1',
                fontSize: 12,
                textAlign: 'left',
                borderTop: '1px solid #334155',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              onClick={() => { setShowMenu(false); cameraRef.current?.click() }}
            >
              📷 拍照
            </button>
          </div>
        </>
      )}

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}
