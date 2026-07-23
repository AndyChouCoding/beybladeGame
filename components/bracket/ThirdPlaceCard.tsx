'use client'
import { Match } from '@/types'
import { useTournamentStore } from '@/store/tournamentStore'
import PlayerAvatar from '@/components/ui/PlayerAvatar'

interface Props {
  match: Match
}

export default function ThirdPlaceCard({ match }: Props) {
  const startThirdPlaceMatch = useTournamentStore((s) => s.startThirdPlaceMatch)
  const resolveThirdPlaceBye = useTournamentStore((s) => s.resolveThirdPlaceBye)

  const isBye = match.player1 === null || match.player2 === null
  const canStart = match.status === 'pending' && !isBye
  const needsByeConfirm = match.status === 'pending' && isBye

  return (
    <div
      className="rounded-xl overflow-hidden text-sm"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${match.status === 'active' ? 'var(--accent)' : '#1e293b'}`,
        minWidth: '160px',
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
            className="flex items-center gap-2 px-2 py-2"
            style={{
              backgroundColor: isWinner ? 'rgba(180,83,9,0.15)' : 'transparent',
              borderBottom: slot === 1 ? '1px solid #1e293b' : 'none',
              color: isLoser ? '#475569' : isWinner ? '#d97706' : '#f1f5f9',
            }}
          >
            {player ? (
              <PlayerAvatar player={player} size={20} />
            ) : (
              <div style={{ width: 20, height: 20, flexShrink: 0 }} />
            )}
            <span className="truncate flex-1 text-xs">
              {player ? player.name : <span className="text-slate-600 italic">BYE</span>}
            </span>
            {match.status === 'completed' && player && (
              <span className="font-bold text-xs">{score}</span>
            )}
            {isWinner && <span className="text-xs">W</span>}
          </div>
        )
      })}

      {needsByeConfirm && (
        <div className="px-2 py-1.5 text-center" style={{ borderTop: '1px solid #1e293b' }}>
          <p className="text-xs text-slate-500 mb-1.5">名額不足，無法舉行季軍賽</p>
          <button
            onClick={resolveThirdPlaceBye}
            className="w-full py-1.5 text-xs font-bold"
            style={{ backgroundColor: 'var(--accent)', color: '#0f0f1a' }}
          >
            確認繼續
          </button>
        </div>
      )}

      {canStart && (
        <button
          onClick={startThirdPlaceMatch}
          className="w-full py-1.5 text-xs font-bold"
          style={{ backgroundColor: 'var(--accent)', color: '#0f0f1a' }}
        >
          開始比賽
        </button>
      )}
    </div>
  )
}
