import { Player, Match, Bracket } from '@/types'

function nextPowerOf2(n: number): number {
  let power = 1
  while (power < n) power *= 2
  return power
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function propagateByes(bracket: Bracket): void {
  for (let r = 0; r < bracket.length - 1; r++) {
    for (let m = 0; m < bracket[r].length; m++) {
      const match = bracket[r][m]
      if (match.status === 'completed' && match.winner) {
        const nextMatchIndex = Math.floor(m / 2)
        const nextMatch = bracket[r + 1][nextMatchIndex]
        if (m % 2 === 0) {
          nextMatch.player1 = match.winner
        } else {
          nextMatch.player2 = match.winner
        }
        const isNextBye = nextMatch.player1 === null || nextMatch.player2 === null
        const hasOnePlayer = nextMatch.player1 !== null || nextMatch.player2 !== null
        if (isNextBye && hasOnePlayer) {
          nextMatch.winner = nextMatch.player1 ?? nextMatch.player2
          nextMatch.status = 'completed'
        }
      }
    }
  }
}

export function generateBracket(players: Player[]): Bracket {
  const size = nextPowerOf2(players.length)
  const shuffled = shuffle(players)
  const padded: (Player | null)[] = [...shuffled, ...Array(size - players.length).fill(null)]

  const rounds: Bracket = []

  const firstRound: Match[] = []
  for (let i = 0; i < size; i += 2) {
    const p1 = padded[i]
    const p2 = padded[i + 1]
    const isBye = p1 === null || p2 === null
    firstRound.push({
      id: `r0m${i / 2}`,
      round: 0,
      matchIndex: i / 2,
      player1: p1,
      player2: p2,
      score1: 0,
      score2: 0,
      winner: isBye ? (p1 ?? p2) : null,
      status: isBye ? 'completed' : 'pending',
    })
  }
  rounds.push(firstRound)

  let matchCount = size / 4
  let roundIndex = 1
  while (matchCount >= 1) {
    const round: Match[] = []
    for (let i = 0; i < matchCount; i++) {
      round.push({
        id: `r${roundIndex}m${i}`,
        round: roundIndex,
        matchIndex: i,
        player1: null,
        player2: null,
        score1: 0,
        score2: 0,
        winner: null,
        status: 'pending',
      })
    }
    rounds.push(round)
    matchCount = Math.floor(matchCount / 2)
    roundIndex++
  }

  propagateByes(rounds)
  return rounds
}

export function getRoundName(roundIndex: number, totalRounds: number): string {
  const remaining = totalRounds - roundIndex
  if (remaining === 1) return '決賽'
  if (remaining === 2) return '準決賽'
  if (remaining === 3) return '八強賽'
  return `第 ${roundIndex + 1} 輪`
}
