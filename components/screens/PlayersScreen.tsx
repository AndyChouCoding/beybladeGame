'use client'
import { useState } from 'react'
import { useTournamentStore } from '@/store/tournamentStore'
import { Player } from '@/types'

export default function PlayersScreen() {
  const { tournamentName, playerCount, setPlayers, initBracket, reset } = useTournamentStore()
  const [names, setNames] = useState<string[]>(Array(playerCount).fill(''))

  const updateName = (i: number, value: string) => {
    setNames((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const players: Player[] = names
      .filter((n) => n.trim())
      .map((n, i) => ({ id: `p${i}`, name: n.trim() }))
    if (players.length < 2) return
    setPlayers(players)
    initBracket()
  }

  const filledCount = names.filter((n) => n.trim()).length

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-amber-400">{tournamentName}</h1>
            <p className="text-slate-400 text-sm mt-1">輸入 {playerCount} 位選手姓名</p>
          </div>
          <button className="btn-ghost" onClick={reset}>
            重新開始
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="rounded-2xl p-6 flex flex-col gap-3 mb-6"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #1e293b' }}
          >
            {names.map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#1e293b', color: '#64748b' }}
                >
                  {i + 1}
                </span>
                <input
                  type="text"
                  placeholder={`選手 ${i + 1}`}
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const next = document.querySelectorAll<HTMLInputElement>('input[type=text]')[i + 1]
                      next?.focus()
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500 text-center">
              已填入 {filledCount} / {playerCount} 人
              {filledCount < playerCount && filledCount >= 2 && (
                <span className="text-amber-600">（未填欄位將自動補輪空）</span>
              )}
            </p>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={filledCount < 2}
            >
              產生賽程表
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
