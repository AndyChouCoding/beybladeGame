'use client'
import { useState } from 'react'
import { useTournamentStore } from '@/store/tournamentStore'

export default function SetupScreen() {
  const setSetup = useTournamentStore((s) => s.setSetup)
  const [name, setName] = useState('')
  const [count, setCount] = useState(8)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || count < 2) return
    setSetup(name.trim(), count)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🌀</div>
          <h1 className="text-3xl font-bold text-amber-400 mb-2">陀螺比賽轉播系統</h1>
          <p className="text-slate-400 text-sm">Spinning Top Tournament Broadcaster</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-8 flex flex-col gap-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #1e293b' }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">比賽名稱</label>
            <input
              type="text"
              placeholder="例：2025 全國陀螺錦標賽"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">參賽人數</label>
            <input
              type="number"
              min={2}
              max={64}
              value={count}
              onChange={(e) => setCount(Math.max(2, parseInt(e.target.value) || 2))}
            />
            <p className="text-xs text-slate-500">
              若人數非 2 的冪次，將自動補輪空（BYE）
            </p>
          </div>

          <button type="submit" className="btn-primary w-full mt-2" disabled={!name.trim()}>
            下一步：輸入選手
          </button>
        </form>
      </div>
    </div>
  )
}
