'use client'
import { useTournamentStore } from '@/store/tournamentStore'
import PlayerAvatar from '@/components/ui/PlayerAvatar'

export default function ChampionScreen() {
  const { champion, tournamentName, reset } = useTournamentStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="mb-8">
        <div className="text-6xl mb-4">🏆</div>
        <p className="text-slate-400 text-sm mb-2">{tournamentName}</p>
        <h1 className="text-2xl font-bold text-slate-300 mb-6">比賽結束</h1>
        <p className="text-slate-400 text-base mb-4">冠軍</p>

        {/* Champion avatar */}
        {champion && (
          <div className="flex justify-center mb-5">
            <div
              style={{
                padding: 4,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                boxShadow: '0 0 40px rgba(245,158,11,0.5)',
              }}
            >
              <PlayerAvatar player={champion} size={120} />
            </div>
          </div>
        )}

        <h2
          className="text-5xl font-black mb-8"
          style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(245,158,11,0.4)' }}
        >
          {champion?.name ?? '—'}
        </h2>
      </div>

      <div
        className="w-64 h-px mb-8"
        style={{ backgroundColor: '#1e293b' }}
      />

      <button className="btn-primary" onClick={reset}>
        舉辦新比賽
      </button>
    </div>
  )
}
