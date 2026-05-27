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
      if (match.status !== 'completed') continue

      const nextMatchIndex = Math.floor(m / 2)
      const nextMatch = bracket[r + 1][nextMatchIndex]

      // Fill this slot (winner may be null for a null-vs-null BYE)
      if (m % 2 === 0) {
        nextMatch.player1 = match.winner
      } else {
        nextMatch.player2 = match.winner
      }

      // Only auto-complete the next match when BOTH its feeding matches are already
      // resolved.  If the peer is still 'pending', that slot will be filled by a real
      // player later — treating it as a permanent BYE would skip real matches.
      const peerIndex = m % 2 === 0 ? m + 1 : m - 1
      const peer = bracket[r][peerIndex]

      if (peer.status === 'completed' && nextMatch.status === 'pending') {
        const { player1: p1, player2: p2 } = nextMatch
        if (p1 !== null && p2 === null) {
          nextMatch.winner = p1
          nextMatch.status = 'completed'
        } else if (p2 !== null && p1 === null) {
          nextMatch.winner = p2
          nextMatch.status = 'completed'
        } else if (p1 === null && p2 === null) {
          // Both sides are BYEs — mark as completed with no winner
          nextMatch.winner = null
          nextMatch.status = 'completed'
        }
        // Both non-null → real match, leave as pending
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
