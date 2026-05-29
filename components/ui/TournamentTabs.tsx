'use client'
import { useState } from 'react'
import { useTournamentStore } from '@/store/tournamentStore'
import { Player } from '@/types'

const PHASE_DOT: Record<string, string> = {
  setup:    '#475569',
  players:  '#3b82f6',
  bracket:  '#f59e0b',
  match:    '#22c55e',
  champion: '#fbbf24',
}

export default function TournamentTabs() {
  const {
    tournaments,
    activeTournamentId,
    tournamentName,
    phase,
    players,
    switchTournament,
    createTournament,
    createMixedTournament,
    deleteTournament,
  } = useTournamentStore()

  const [showMenu, setShowMenu] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [mixedName, setMixedName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const canDelete = Object.keys(tournaments).length > 1

  // For active tab, read live flat state; for others, read snapshot
  const tabs = Object.values(tournaments).map((t) => ({
    id: t.id,
    name: t.id === activeTournamentId
      ? (tournamentName || '未命名')
      : (t.tournamentName || '未命名'),
    phase: t.id === activeTournamentId ? phase : t.phase,
  }))

  // Gather all players across all tournaments for the picker
  const groups = Object.values(tournaments)
    .map((t) => ({
      tournamentId: t.id,
      tournamentName: t.id === activeTournamentId
        ? (tournamentName || '未命名')
        : (t.tournamentName || '未命名'),
      players: t.id === activeTournamentId ? players : t.players,
    }))
    .filter((g) => g.players.length > 0)

  const allPlayerMap = new Map<string, Player>(
    groups.flatMap((g) => g.players.map((p) => [p.id, p]))
  )

  const togglePlayer = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleCreateMixed = () => {
    if (!mixedName.trim() || selected.size < 2) return
    const chosenPlayers = [...selected]
      .map((id) => allPlayerMap.get(id))
      .filter(Boolean) as Player[]
    createMixedTournament(mixedName.trim(), chosenPlayers)
    setShowPicker(false)
    setMixedName('')
    setSelected(new Set())
  }

  const openPicker = () => {
    setShowMenu(false)
    setShowPicker(true)
  }

  const closePicker = () => {
    setShowPicker(false)
    setMixedName('')
    setSelected(new Set())
  }

  return (
    <>
      {/* ── Tab bar ── */}
      <div
        className="flex items-stretch flex-shrink-0 overflow-x-auto"
        style={{ backgroundColor: '#0a0a14', borderBottom: '1px solid #1e293b', minHeight: 40 }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTournamentId
          return (
            <button
              key={tab.id}
              onClick={() => switchTournament(tab.id)}
              className="flex items-center gap-1.5 px-3 flex-shrink-0"
              style={{
                color: isActive ? '#f1f5f9' : '#64748b',
                backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
                borderRight: '1px solid #1e293b',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: '0.75rem',
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                outline: 'none',
                transition: 'color 0.15s, background-color 0.15s',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: PHASE_DOT[tab.phase] ?? '#475569',
                  flexShrink: 0,
                  display: 'block',
                  ...(tab.phase === 'match' ? { boxShadow: `0 0 5px ${PHASE_DOT.match}` } : {}),
                }}
              />
              <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tab.name}
              </span>
              {canDelete && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); deleteTournament(tab.id) }}
                  className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors"
                  style={{ fontSize: '1rem', lineHeight: 1, padding: '0 2px', cursor: 'pointer' }}
                >
                  ×
                </span>
              )}
            </button>
          )
        })}

        {/* Add button */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              borderRight: '1px solid #1e293b',
              color: '#475569',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '0 12px',
              height: '100%',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            + 新增組別
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div
                className="absolute top-full left-0 z-20 rounded-xl overflow-hidden"
                style={{
                  backgroundColor: '#1a2236',
                  border: '1px solid #334155',
                  minWidth: 156,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  marginTop: 4,
                }}
              >
                <button
                  onClick={() => { createTournament(); setShowMenu(false) }}
                  className="w-full text-left"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                    padding: '10px 16px',
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  全新組別
                </button>
                <div style={{ borderTop: '1px solid #334155' }} />
                <button
                  onClick={openPicker}
                  className="w-full text-left"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                    padding: '10px 16px',
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  混合組…
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mixed group picker modal ── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #334155', maxHeight: '90vh' }}
          >
            <div>
              <h2 className="text-base font-bold text-amber-400">建立混合組</h2>
              <p className="text-xs text-slate-500 mt-0.5">從現有組別的選手中選取</p>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">組別名稱</label>
              <input
                type="text"
                placeholder="例：混合組 A"
                value={mixedName}
                onChange={(e) => setMixedName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Player picker */}
            {groups.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">目前各組別均無選手可選取</p>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
                {groups.map((group) => (
                  <div key={group.tournamentId}>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">
                      {group.tournamentName}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.players.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                          style={{
                            backgroundColor: selected.has(p.id) ? 'rgba(245,158,11,0.1)' : 'transparent',
                            transition: 'background-color 0.1s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => togglePlayer(p.id)}
                            style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }}
                          />
                          <span className="text-sm text-slate-200">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="btn-primary flex-1"
                disabled={!mixedName.trim() || selected.size < 2}
                onClick={handleCreateMixed}
                style={{ fontSize: '0.875rem', padding: '0.6rem 1rem' }}
              >
                建立（{selected.size} 位選手）
              </button>
              <button className="btn-ghost" onClick={closePicker}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
