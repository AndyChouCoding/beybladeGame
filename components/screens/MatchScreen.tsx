'use client'
import { useEffect, useState, useRef } from 'react'
import { useTournamentStore } from '@/store/tournamentStore'
import CameraView from '@/components/match/CameraView'
import Scoreboard from '@/components/match/Scoreboard'

function EditPlayersModal({
  name1,
  name2,
  onSave,
  onClose,
}: {
  name1: string
  name2: string
  onSave: (n1: string, n2: string) => void
  onClose: () => void
}) {
  const [v1, setV1] = useState(name1)
  const [v2, setV2] = useState(name2)
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="rounded-2xl p-6 w-80 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #334155' }}
      >
        <h3 className="text-sm font-bold text-slate-300">編輯選手姓名</h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">選手 1</label>
            <input type="text" value={v1} onChange={(e) => setV1(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">選手 2</label>
            <input
              type="text"
              value={v2}
              onChange={(e) => setV2(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(v1.trim() || name1, v2.trim() || name2)
              }}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            className="btn-primary"
            style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
            onClick={() => onSave(v1.trim() || name1, v2.trim() || name2)}
          >
            確認
          </button>
          <button className="btn-ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}

const COUNTDOWN_STEPS = ['3', '2', '1', 'GO SHOOT']
const WIN_SCORE = 4

type MatchPhase = 'idle' | 'countdown' | 'active' | 'finished'

export default function MatchScreen() {
  const { bracket, currentRound, currentMatchIndex, addScore, removeScore, completeMatch, updatePlayer } =
    useTournamentStore()

  const match = bracket[currentRound]?.[currentMatchIndex]
  const [phase, setPhase] = useState<MatchPhase>('idle')
  const [showEditPlayers, setShowEditPlayers] = useState(false)
  const [countdownText, setCountdownText] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const score1 = match?.score1 ?? 0
  const score2 = match?.score2 ?? 0
  const winner = match?.winner ?? null

  // Auto-detect win
  useEffect(() => {
    if (phase !== 'active') return
    if (score1 >= WIN_SCORE || score2 >= WIN_SCORE) {
      setPhase('finished')
    }
  }, [score1, score2, phase])

  const handleAddScore = (player: 1 | 2) => {
    if (phase !== 'active') return
    const newScore = player === 1 ? score1 + 1 : score2 + 1
    addScore(player)
    if (newScore >= WIN_SCORE) {
      completeMatch(player)
      setPhase('finished')
    }
  }

  const handleRemoveScore = (player: 1 | 2) => {
    if (phase !== 'active') return
    removeScore(player)
  }

  const startCountdown = () => {
    setPhase('countdown')
    let step = 0
    const tick = () => {
      if (step >= COUNTDOWN_STEPS.length) {
        setCountdownText(null)
        setPhase('active')
        return
      }
      setCountdownText(COUNTDOWN_STEPS[step])
      step++
      timerRef.current = setTimeout(tick, 1000)
    }
    tick()
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const goBack = useTournamentStore((s) => s.goToBracket)

  if (!match || !match.player1 || !match.player2) return null

  // Shared phase control UI — rendered in two places (desktop / mobile)
  const phaseControls = (
    <>
      {phase === 'idle' && (
        <button
          className="btn-primary"
          style={{ fontSize: '1rem', padding: '0.75rem 2.5rem', letterSpacing: '0.05em' }}
          onClick={startCountdown}
        >
          比賽開始
        </button>
      )}
      {phase === 'countdown' && (
        <span className="text-slate-400 text-sm animate-pulse">準備中...</span>
      )}
      {phase === 'active' && (
        <span className="text-xs text-slate-600">點擊計分板加分</span>
      )}
      {phase === 'finished' && (
        <span className="text-slate-500 text-sm">比賽已結束</span>
      )}
    </>
  )

  return (
    <div className="relative flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid #1e293b', height: '44px' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-bold text-amber-400 truncate">
            {match.player1.name} vs {match.player2.name}
          </h2>
          <button
            onClick={() => setShowEditPlayers(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', fontSize: '0.75rem', flexShrink: 0, padding: '2px 4px',
            }}
            title="編輯選手姓名"
          >
            ✏
          </button>
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0">
          {phase === 'idle'      && '等待開始'}
          {phase === 'countdown' && '倒數中...'}
          {phase === 'active'    && '比賽進行中'}
          {phase === 'finished'  && '比賽結束'}
        </span>
      </header>

      {/* ── Main area ──
          Mobile  (< md): flex-col  — camera top, controls bar, scoreboard strip
          Desktop (≥ md): flex-row  — camera left (~68%), scoreboard right (~32%)
      */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

        {/* Camera area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 p-2 md:p-3 overflow-hidden">
            <CameraView
              countdownOverlay={phase === 'countdown' ? countdownText : null}
            />
          </div>

          {/* Desktop phase controls (below camera) */}
          <div
            className="hidden md:flex items-center justify-center py-4 px-3 flex-shrink-0"
            style={{ borderTop: '1px solid #1e293b' }}
          >
            {phaseControls}
          </div>
        </div>

        {/* Mobile phase controls bar (between camera and scoreboard) */}
        <div
          className="md:hidden flex items-center justify-center py-2 px-3 flex-shrink-0"
          style={{ borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}
        >
          {phaseControls}
        </div>

        {/* Scoreboard
            Mobile : full-width horizontal strip at the bottom
            Desktop: fixed-width right sidebar                   */}
        <div
          className="flex-shrink-0 md:w-[32%] md:border-l border-slate-800"
        >
          <Scoreboard
            player1={match.player1}
            player2={match.player2}
            score1={score1}
            score2={score2}
            winner={winner}
            isActive={phase === 'active'}
            onAddScore={handleAddScore}
            onRemoveScore={handleRemoveScore}
          />
        </div>
      </div>

      {/* ── Edit players modal ── */}
      {showEditPlayers && (
        <EditPlayersModal
          name1={match.player1.name}
          name2={match.player2.name}
          onSave={(n1, n2) => {
            updatePlayer(match.player1!.id, n1)
            updatePlayer(match.player2!.id, n2)
            setShowEditPlayers(false)
          }}
          onClose={() => setShowEditPlayers(false)}
        />
      )}

      {/* ── Winner overlay ── */}
      {phase === 'finished' && winner && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="text-center p-10 rounded-3xl pointer-events-auto"
            style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--accent)' }}
          >
            <p className="text-slate-400 text-sm mb-2">勝利者</p>
            <p className="text-4xl font-black text-amber-400 mb-6">{winner.name}</p>
            <p className="text-slate-400 text-sm mb-6">
              比分：{score1} : {score2}
            </p>
            <button className="btn-primary" onClick={goBack}>
              返回賽程表
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
