'use client'
import { useTournamentStore } from '@/store/tournamentStore'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import { Player } from '@/types'

interface RankSpec {
  place: 1 | 2 | 3
  label: string
  avatarSize: number
  standHeight: number
  ring: string
  glow: string
  color: string
}

const RANKS: RankSpec[] = [
  {
    place: 2,
    label: '亞軍',
    avatarSize: 88,
    standHeight: 90,
    ring: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
    glow: 'rgba(148,163,184,0.4)',
    color: '#cbd5e1',
  },
  {
    place: 1,
    label: '冠軍',
    avatarSize: 120,
    standHeight: 130,
    ring: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    glow: 'rgba(245,158,11,0.5)',
    color: 'var(--accent)',
  },
  {
    place: 3,
    label: '季軍',
    avatarSize: 76,
    standHeight: 60,
    ring: 'linear-gradient(135deg, #b45309, #d97706)',
    glow: 'rgba(180,83,9,0.4)',
    color: '#d97706',
  },
]

function PodiumStand({ rank, player }: { rank: RankSpec; player: Player | null }) {
  if (!player) return <div style={{ width: 140, flexShrink: 0 }} />

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 140 }}>
      <div
        style={{
          padding: 4,
          borderRadius: '50%',
          background: rank.ring,
          boxShadow: `0 0 30px ${rank.glow}`,
          marginBottom: 12,
        }}
      >
        <PlayerAvatar player={player} size={rank.avatarSize} />
      </div>
      <p className="text-xs mb-1" style={{ color: rank.color }}>
        {rank.label}
      </p>
      <p
        className="font-black text-center truncate w-full px-1"
        style={{ color: rank.color, fontSize: rank.place === 1 ? '1.375rem' : '1rem' }}
      >
        {player.name}
      </p>
      <div
        className="w-full mt-4 rounded-t-lg flex items-start justify-center pt-2"
        style={{
          height: rank.standHeight,
          background: 'linear-gradient(180deg, rgba(30,41,59,0.6), rgba(30,41,59,0.2))',
          border: '1px solid #1e293b',
          borderBottom: 'none',
        }}
      >
        <span className="text-3xl font-black" style={{ color: rank.color, opacity: 0.5 }}>
          {rank.place}
        </span>
      </div>
    </div>
  )
}

export default function ChampionScreen() {
  const { champion, runnerUp, thirdPlace, tournamentName, reset } = useTournamentStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center py-8">
      <div className="text-5xl mb-3">🏆</div>
      <p className="text-slate-400 text-sm mb-1">{tournamentName}</p>
      <h1 className="text-2xl font-bold text-slate-300 mb-10">比賽結束</h1>

      <div className="flex items-end justify-center gap-4 mb-10">
        <PodiumStand rank={RANKS[0]} player={runnerUp} />
        <PodiumStand rank={RANKS[1]} player={champion} />
        <PodiumStand rank={RANKS[2]} player={thirdPlace} />
      </div>

      <div className="w-64 h-px mb-8" style={{ backgroundColor: '#1e293b' }} />

      <button className="btn-primary" onClick={reset}>
        舉辦新比賽
      </button>
    </div>
  )
}
