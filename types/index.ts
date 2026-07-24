export interface Player {
  id: string
  name: string
  photoUrl?: string
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

export interface TournamentState {
  id: string
  tournamentName: string
  playerCount: number
  players: Player[]
  bracket: Bracket
  currentRound: number
  currentMatchIndex: number
  phase: Phase
  champion: Player | null
  thirdPlaceMatch: Match | null
  runnerUp: Player | null
  thirdPlace: Player | null
}
