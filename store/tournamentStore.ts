import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Player, Bracket, Phase } from '@/types'
import { generateBracket } from '@/utils/bracket'

interface TournamentStore {
  tournamentName: string
  playerCount: number
  players: Player[]
  bracket: Bracket
  currentRound: number
  currentMatchIndex: number
  phase: Phase
  champion: Player | null

  setSetup: (name: string, count: number) => void
  setPlayers: (players: Player[]) => void
  initBracket: () => void
  startMatch: (round: number, matchIndex: number) => void
  addScore: (player: 1 | 2) => void
  removeScore: (player: 1 | 2) => void
  completeMatch: (winner: 1 | 2) => void
  goToBracket: () => void
  reset: () => void
}

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      tournamentName: '',
      playerCount: 4,
      players: [],
      bracket: [],
      currentRound: 0,
      currentMatchIndex: 0,
      phase: 'setup',
      champion: null,

      setSetup: (name, count) =>
        set({ tournamentName: name, playerCount: count, phase: 'players' }),

      setPlayers: (players) => set({ players }),

      initBracket: () => {
        const { players } = get()
        const bracket = generateBracket(players)
        set({ bracket, phase: 'bracket', champion: null })
      },

      startMatch: (round, matchIndex) => {
        set((state) => {
          const newBracket = state.bracket.map((r) => r.map((m) => ({ ...m })))
          newBracket[round][matchIndex].status = 'active'
          return {
            bracket: newBracket,
            currentRound: round,
            currentMatchIndex: matchIndex,
            phase: 'match',
          }
        })
      },

      addScore: (player) => {
        set((state) => {
          const { currentRound, currentMatchIndex } = state
          const newBracket = state.bracket.map((r) => r.map((m) => ({ ...m })))
          const match = newBracket[currentRound][currentMatchIndex]
          if (player === 1 && match.score1 < 4) match.score1++
          if (player === 2 && match.score2 < 4) match.score2++
          return { bracket: newBracket }
        })
      },

      removeScore: (player) => {
        set((state) => {
          const { currentRound, currentMatchIndex } = state
          const newBracket = state.bracket.map((r) => r.map((m) => ({ ...m })))
          const match = newBracket[currentRound][currentMatchIndex]
          if (player === 1 && match.score1 > 0) match.score1--
          if (player === 2 && match.score2 > 0) match.score2--
          return { bracket: newBracket }
        })
      },

      completeMatch: (winner) => {
        set((state) => {
          const { currentRound, currentMatchIndex } = state
          const newBracket = state.bracket.map((r) => r.map((m) => ({ ...m })))
          const match = newBracket[currentRound][currentMatchIndex]

          match.winner = winner === 1 ? match.player1 : match.player2
          match.status = 'completed'

          const nextRound = currentRound + 1
          const isFinal = nextRound >= newBracket.length

          if (!isFinal) {
            const nextMatchIndex = Math.floor(currentMatchIndex / 2)
            const nextMatch = newBracket[nextRound][nextMatchIndex]
            if (currentMatchIndex % 2 === 0) {
              nextMatch.player1 = match.winner
            } else {
              nextMatch.player2 = match.winner
            }
          }

          return {
            bracket: newBracket,
            phase: isFinal ? 'champion' : 'bracket',
            champion: isFinal ? match.winner : state.champion,
          }
        })
      },

      goToBracket: () => set({ phase: 'bracket' }),

      reset: () =>
        set({
          tournamentName: '',
          playerCount: 4,
          players: [],
          bracket: [],
          currentRound: 0,
          currentMatchIndex: 0,
          phase: 'setup',
          champion: null,
        }),
    }),
    { name: 'gyro-battle-store' }
  )
)
