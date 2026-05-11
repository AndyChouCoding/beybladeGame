'use client'
import { useEffect, useState, useRef } from 'react'
import { useTournamentStore } from '@/store/tournamentStore'
import CameraView from '@/components/match/CameraView'
import Scoreboard from '@/components/match/Scoreboard'

const COUNTDOWN_STEPS = ['3', '2', '1', 'GO SHOOT']
const WIN_SCORE = 4

type MatchPhase = 'idle' | 'countdown' | 'active' | 'finished'

export default function MatchScreen() {
  const { bracket, currentRound, currentMatchIndex, addScore, removeScore, completeMatch } =
    useTournamentStore()

  const match = bracket[currentRound]?.[currentMatchIndex]
  const [phase, setPhase] = useState<MatchPhase>('idle')
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

  return (
    <div className="relative flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid #1e293b', height: '44px' }}
      >
        <h2 className="text-sm font-bold text-amber-400">
          {match.player1.name} vs {match.player2.name}
        </h2>
        <span className="text-xs text-slate-500">
          {phase === 'idle' && '等待開始'}
          {phase === 'countdown' && '倒數中...'}
          {phase === 'active' && '比賽進行中'}
          {phase === 'finished' && '比賽結束'}
        </span>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Camera (80%) */}
        <div className="flex flex-col" style={{ width: '80%' }}>
          <div className="flex-1 p-3 pb-0 overflow-hidden">
            <CameraView
              isTracking={phase === 'active'}
              countdownOverlay={phase === 'countdown' ? countdownText : null}
            />
          </div>

          {/* Start button */}
          <div className="flex items-center justify-center py-4 px-3">
            {phase === 'idle' && (
              <button
                className="btn-primary"
                style={{ fontSize: '1.1rem', padding: '0.875rem 3rem', letterSpacing: '0.05em' }}
                onClick={startCountdown}
              >
                比賽開始
              </button>
            )}
            {phase === 'countdown' && (
              <span className="text-slate-400 text-sm animate-pulse">準備中...</span>
            )}
            {phase === 'active' && (
              <span className="text-xs text-slate-600">點擊右側計分板加分</span>
            )}
            {phase === 'finished' && (
              <span className="text-slate-500 text-sm">比賽已結束</span>
            )}
          </div>
        </div>

        {/* Right: Scoreboard (20%) */}
        <div style={{ width: '20%' }}>
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

      {/* Winner overlay */}
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
