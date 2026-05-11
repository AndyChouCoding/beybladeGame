'use client'
import { useRef, useLayoutEffect, useState } from 'react'
import { Bracket } from '@/types'
import MatchCard from './MatchCard'
import { getRoundName } from '@/utils/bracket'

interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Props {
  bracket: Bracket
}

const SLOT_HEIGHT = 88

export default function BracketView({ bracket }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const matchRefs = useRef<(HTMLDivElement | null)[][]>(
    bracket.map((r) => Array(r.length).fill(null))
  )
  const [lines, setLines] = useState<Line[]>([])

  const totalSlots = (bracket[0]?.length ?? 1) * 2
  const containerHeight = Math.max(totalSlots * SLOT_HEIGHT, 300)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const newLines: Line[] = []
    const containerRect = container.getBoundingClientRect()

    for (let r = 0; r < bracket.length - 1; r++) {
      for (let m = 0; m < bracket[r].length; m++) {
        const fromEl = matchRefs.current[r]?.[m]
        const toEl = matchRefs.current[r + 1]?.[Math.floor(m / 2)]
        if (!fromEl || !toEl) continue

        const from = fromEl.getBoundingClientRect()
        const to = toEl.getBoundingClientRect()

        const x1 = from.right - containerRect.left
        const y1 = from.top + from.height / 2 - containerRect.top
        const x2 = to.left - containerRect.left
        const y2 = to.top + to.height / 2 - containerRect.top
        const midX = (x1 + x2) / 2

        newLines.push({ x1, y1, x2: midX, y2: y1 })
        newLines.push({ x1: midX, y1, x2: midX, y2 })
        newLines.push({ x1: midX, y1: y2, x2, y2 })
      }
    }

    setLines(newLines)
  }, [bracket])

  return (
    <div
      ref={containerRef}
      className="relative flex gap-14 overflow-x-auto pb-4 px-2"
      style={{ minHeight: containerHeight }}
    >
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#334155"
            strokeWidth="2"
          />
        ))}
      </svg>

      {bracket.map((round, r) => (
        <div
          key={r}
          className="flex flex-col justify-around flex-shrink-0"
          style={{ minHeight: containerHeight }}
        >
          <div className="absolute top-0 text-xs text-slate-500 font-semibold mb-2">
            {getRoundName(r, bracket.length)}
          </div>
          <div className="flex flex-col justify-around h-full gap-2">
            {round.map((match, m) => (
              <div
                key={match.id}
                ref={(el) => {
                  if (!matchRefs.current[r]) matchRefs.current[r] = []
                  matchRefs.current[r][m] = el
                }}
              >
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
