'use client'
import { Player } from '@/types'
import PlayerAvatar from '@/components/ui/PlayerAvatar'

interface Props {
  player1: Player
  player2: Player
  score1: number
  score2: number
  winner: Player | null
  isActive: boolean
  onAddScore: (player: 1 | 2) => void
  onRemoveScore: (player: 1 | 2) => void
}

const WIN_SCORE = 4

function ScoreDisplay({ score, max = WIN_SCORE }: { score: number; max?: number }) {
  return (
    <div className="flex gap-1 md:gap-2 justify-center mt-1 md:mt-2 flex-wrap">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`score-dot ${i < score ? 'filled' : ''}`}
          style={{ color: '#f59e0b', width: 14, height: 14 }}
        />
      ))}
    </div>
  )
}

interface PlayerPanelProps {
  player: Player
  score: number
  isWinner: boolean
  isLoser: boolean
  isActive: boolean
  playerSlot: 1 | 2
  onAdd: () => void
  onRemove: () => void
}

function PlayerPanel({
  player,
  score,
  isWinner,
  isLoser,
  isActive,
  onAdd,
  onRemove,
}: PlayerPanelProps) {
  const canAdd = isActive && score < WIN_SCORE
  const canRemove = isActive && score > 0

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative select-none overflow-hidden py-2 md:py-0"
      style={{
        backgroundColor: isWinner
          ? 'rgba(245,158,11,0.12)'
          : isLoser
          ? 'rgba(0,0,0,0.3)'
          : 'transparent',
        cursor: canAdd ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
      }}
      onClick={canAdd ? onAdd : undefined}
    >
      {/* +1 hover hint */}
      {isActive && canAdd && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}
        >
          <span className="text-3xl md:text-4xl font-black text-amber-400 opacity-60">+1</span>
        </div>
      )}

      {/* WIN badge */}
      {isWinner && (
        <div className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-gray-900">
          WIN
        </div>
      )}

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-0.5 md:gap-1 mb-1 md:mb-2">
        <PlayerAvatar player={player} size={34} />
        <p
          className="text-xs font-semibold px-1 text-center truncate"
          style={{
            color: isLoser ? '#475569' : '#94a3b8',
            maxWidth: '90px',
          }}
        >
          {player.name}
        </p>
      </div>

      {/* Score number */}
      <div
        className="text-4xl md:text-6xl font-black leading-none"
        style={{ color: isWinner ? '#f59e0b' : isLoser ? '#334155' : '#f1f5f9' }}
      >
        {score}
      </div>

      <ScoreDisplay score={score} />

      {/* −1 button */}
      {canRemove && (
        <button
          className="absolute bottom-1 right-1 md:bottom-3 md:right-3 text-xs text-slate-600 hover:text-slate-400 transition-colors px-1.5 py-0.5"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          −1
        </button>
      )}
    </div>
  )
}

export default function Scoreboard({
  player1,
  player2,
  score1,
  score2,
  winner,
  isActive,
  onAddScore,
  onRemoveScore,
}: Props) {
  return (
    /* Mobile: flex-row (side-by-side)  |  Desktop md+: flex-col (stacked) */
    <div className="flex flex-row md:flex-col h-full">

      {/* Desktop-only header */}
      <div
        className="hidden md:block px-3 py-2 text-center text-xs font-semibold text-slate-500 flex-shrink-0"
        style={{ borderBottom: '1px solid #1e293b' }}
      >
        計分板
      </div>

      {/* Player 1 */}
      <PlayerPanel
        player={player1}
        score={score1}
        isWinner={winner?.id === player1.id}
        isLoser={!!winner && winner.id !== player1.id}
        isActive={isActive}
        playerSlot={1}
        onAdd={() => onAddScore(1)}
        onRemove={() => onRemoveScore(1)}
      />

      {/* Divider: vertical line on mobile, horizontal strip on desktop */}
      <div
        className="md:hidden self-stretch flex-shrink-0"
        style={{ width: '1px', backgroundColor: '#1e293b' }}
      />
      <div
        className="hidden md:block flex-shrink-0"
        style={{ borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}
      >
        <div className="py-1 text-center text-xs text-slate-600">VS</div>
      </div>

      {/* Player 2 */}
      <PlayerPanel
        player={player2}
        score={score2}
        isWinner={winner?.id === player2.id}
        isLoser={!!winner && winner.id !== player2.id}
        isActive={isActive}
        playerSlot={2}
        onAdd={() => onAddScore(2)}
        onRemove={() => onRemoveScore(2)}
      />
    </div>
  )
}
