'use client'
import { Match } from '@/types'
import { useTournamentStore } from '@/store/tournamentStore'

interface Props {
  match: Match
}

export default function MatchCard({ match }: Props) {
  const startMatch = useTournamentStore((s) => s.startMatch)
  const canStart =
    match.status === 'pending' &&
    match.player1 !== null &&
    match.player2 !== null

  const isBye = match.status === 'completed' && (match.player1 === null || match.player2 === null)

  return (
    <div
      className="rounded-xl overflow-hidden text-sm"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${match.status === 'active' ? 'var(--accent)' : '#1e293b'}`,
        minWidth: '160px',
        opacity: isBye ? 0.5 : 1,
      }}
    >
      {[1, 2].map((slot) => {
        const player = slot === 1 ? match.player1 : match.player2
        const score = slot === 1 ? match.score1 : match.score2
        const isWinner = match.winner?.id === player?.id && match.status === 'completed'
        const isLoser = match.winner && match.winner.id !== player?.id && match.status === 'completed' && player

        return (
          <div
            key={slot}
            className="flex items-center justify-between px-3 py-2"
            style={{
              backgroundColor: isWinner ? 'rgba(245,158,11,0.15)' : 'transparent',
              borderBottom: slot === 1 ? '1px solid #1e293b' : 'none',
              color: isLoser ? '#475569' : isWinner ? '#f59e0b' : '#f1f5f9',
            }}
          >
            <span className="truncate max-w-[100px]">
              {player ? player.name : <span className="text-slate-600 italic">BYE</span>}
            </span>
            {match.status === 'completed' && player && (
              <span className="font-bold text-xs ml-2">{score}</span>
            )}
            {isWinner && <span className="text-xs ml-1">W</span>}
          </div>
        )
      })}

      {canStart && (
        <button
          onClick={() => startMatch(match.round, match.matchIndex)}
          className="w-full py-1.5 text-xs font-bold"
          style={{ backgroundColor: 'var(--accent)', color: '#0f0f1a' }}
        >
          開始比賽
        </button>
      )}
    </div>
  )
}
