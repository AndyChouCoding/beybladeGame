'use client'
import { useTournamentStore } from '@/store/tournamentStore'
import BracketView from '@/components/bracket/BracketView'

export default function BracketScreen() {
  const { tournamentName, bracket, reset } = useTournamentStore()

  const totalRounds = bracket.length
  const completedMatches = bracket.flat().filter((m) => m.status === 'completed').length
  const totalRealMatches = bracket.flat().filter(
    (m) => m.player1 !== null && m.player2 !== null
  ).length

  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #1e293b' }}
      >
        <div>
          <h1 className="text-lg font-bold text-amber-400">{tournamentName}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            賽程進度：{completedMatches} / {totalRealMatches} 場完成
          </p>
        </div>
        <button className="btn-ghost" onClick={reset}>
          新比賽
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-14 text-xs text-slate-500 font-semibold mb-4 pl-2">
          {bracket.map((_, r) => (
            <div key={r} className="flex-shrink-0 w-40 text-center">
              {getRoundLabel(r, totalRounds)}
            </div>
          ))}
        </div>
        <BracketView bracket={bracket} />
      </div>
    </div>
  )
}

function getRoundLabel(r: number, total: number): string {
  const remaining = total - r
  if (remaining === 1) return '決賽'
  if (remaining === 2) return '準決賽'
  if (remaining === 3) return '八強賽'
  return `第 ${r + 1} 輪`
}
