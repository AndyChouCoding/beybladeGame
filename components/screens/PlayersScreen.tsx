'use client'
import { useState, useRef } from 'react'
import { useTournamentStore } from '@/store/tournamentStore'
import PlayerAvatar from '@/components/ui/PlayerAvatar'

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

const inlineInputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid transparent',
  borderRadius: 0,
  padding: 0,
  color: '#f1f5f9',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export default function PlayersScreen() {
  const {
    tournamentName,
    players,
    addPlayer,
    updatePlayer,
    setPlayerPhoto,
    removePlayer,
    reorderPlayers,
    importPlayers,
    initBracket,
    reset,
  } = useTournamentStore()

  const [newName, setNewName] = useState('')
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const newNameRef = useRef<HTMLInputElement>(null)

  const handleAddPlayer = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    addPlayer(trimmed)
    setNewName('')
    newNameRef.current?.focus()
  }

  const handleImport = () => {
    const names = importText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length === 0) return
    importPlayers(names)
    setImportText('')
    setShowImport(false)
  }

  const handleExport = async () => {
    if (players.length === 0) return
    const text = players.map((p) => p.name).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDragStart = (i: number) => setDragIndex(i)
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    setDropIndex(i)
  }
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== i) reorderPlayers(dragIndex, i)
    setDragIndex(null)
    setDropIndex(null)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  const canGenerate = players.length >= 2
  const needsBye = canGenerate && players.length !== nextPowerOf2(players.length)

  return (
    <div className="flex flex-col min-h-screen px-4 py-8">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-amber-400">{tournamentName}</h1>
            <p className="text-slate-400 text-sm mt-0.5">選手管理</p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              onClick={() => setShowImport((v) => !v)}
            >
              匯入
            </button>
            <button
              className="btn-ghost"
              onClick={handleExport}
              disabled={players.length === 0}
            >
              {copied ? '已複製！' : '匯出'}
            </button>
            <button className="btn-ghost" onClick={reset}>
              重設
            </button>
          </div>
        </div>

        {/* Import panel */}
        {showImport && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #334155' }}
          >
            <p className="text-xs text-slate-400 mb-2">貼上選手名單（每行一位）：</p>
            <textarea
              rows={5}
              placeholder={'張小明\n李大華\n王美玲\n...'}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                padding: '0.625rem 1rem',
                color: '#f1f5f9',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div className="flex gap-2 mt-3">
              <button className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }} onClick={handleImport}>
                匯入名單
              </button>
              <button
                className="btn-ghost"
                onClick={() => { setShowImport(false); setImportText('') }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Player list */}
        <div
          className="rounded-2xl overflow-hidden mb-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #1e293b' }}
        >
          {players.length === 0 ? (
            <div className="py-12 text-center text-slate-600 text-sm">
              尚無選手，請新增或匯入名單
            </div>
          ) : (
            players.map((player, i) => (
              <div
                key={player.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < players.length - 1 ? '1px solid #1e293b' : 'none',
                  opacity: dragIndex === i ? 0.35 : 1,
                  backgroundColor:
                    dropIndex === i && dragIndex !== i
                      ? 'rgba(245,158,11,0.08)'
                      : 'transparent',
                  transition: 'background-color 0.1s, opacity 0.1s',
                }}
              >
                {/* Drag handle */}
                <span
                  className="text-slate-600 flex-shrink-0 select-none"
                  style={{ fontSize: '1rem', cursor: 'grab', letterSpacing: '-1px' }}
                >
                  ⠿
                </span>

                {/* Avatar — click to upload / take photo */}
                <PlayerAvatar
                  player={player}
                  size={36}
                  editable
                  onPhotoChange={(url) => setPlayerPhoto(player.id, url)}
                />

                {/* Editable name */}
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updatePlayer(player.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      newNameRef.current?.focus()
                    }
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
                  style={inlineInputStyle}
                />

                {/* Delete */}
                <button
                  onClick={() => removePlayer(player.id)}
                  className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors"
                  style={{ fontSize: '1.25rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add player row */}
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #1e293b' }}
        >
          <span className="text-slate-600 select-none flex-shrink-0">+</span>
          <input
            ref={newNameRef}
            type="text"
            placeholder="新增選手..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddPlayer()
              }
            }}
            style={{ ...inlineInputStyle, color: newName ? '#f1f5f9' : undefined }}
          />
          {newName.trim() && (
            <button
              onClick={handleAddPlayer}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, padding: 0 }}
            >
              新增
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 text-center">
            共 {players.length} 位選手
            {needsBye && (
              <span className="text-amber-600 ml-1">（將自動補 {nextPowerOf2(players.length) - players.length} 個輪空）</span>
            )}
          </p>
          <button
            className="btn-primary w-full"
            disabled={!canGenerate}
            onClick={() => initBracket()}
          >
            產生賽程表
          </button>
        </div>
      </div>
    </div>
  )
}
