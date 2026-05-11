export interface Player {
  id: string
  name: string
}

export interface Match {
  id: string
  round: number
  matchIndex: number
  player1: Player | null
  player2: Player | null
  score1: number
  score2: number
  winner: Player | null
  status: 'pending' | 'active' | 'completed'
}

export type Bracket = Match[][]

export type Phase = 'setup' | 'players' | 'bracket' | 'match' | 'champion'
