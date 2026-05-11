'use client'
import { Player } from '@/types'

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
    <div className="flex gap-2 justify-center mt-2">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`score-dot ${i < score ? 'filled' : ''}`}
          style={{ color: '#f59e0b' }}
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
      className="flex-1 flex flex-col items-center justify-center relative select-none overflow-hidden"
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
      {isActive && canAdd && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}
        >
          <span className="text-4xl font-black text-amber-400 opacity-60">+1</span>
        </div>
      )}

      {isWinner && (
        <div className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-gray-900">
          WIN
        </div>
      )}

      <p
        className="text-sm font-semibold mb-2 px-2 text-center truncate w-full"
        style={{ color: isLoser ? '#475569' : '#94a3b8' }}
      >
        {player.name}
      </p>

      <div
        className="text-7xl font-black leading-none"
        style={{ color: isWinner ? '#f59e0b' : isLoser ? '#334155' : '#f1f5f9' }}
      >
        {score}
      </div>

      <ScoreDisplay score={score} />

      {canRemove && (
        <button
          className="absolute bottom-3 right-3 text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1"
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
    <div
      className="flex flex-col h-full"
      style={{ borderLeft: '1px solid #1e293b' }}
    >
      <div
        className="px-3 py-2 text-center text-xs font-semibold text-slate-500"
        style={{ borderBottom: '1px solid #1e293b' }}
      >
        計分板
      </div>

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

      <div style={{ borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div className="py-1 text-center text-xs text-slate-600">VS</div>
      </div>

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
