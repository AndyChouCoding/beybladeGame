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
  goToPlayers: () => void
  reset: () => void

  addPlayer: (name: string) => void
  updatePlayer: (id: string, name: string) => void
  setPlayerPhoto: (id: string, photoUrl: string) => void
  removePlayer: (id: string) => void
  reorderPlayers: (fromIndex: number, toIndex: number) => void
  importPlayers: (names: string[]) => void
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
        set({
          tournamentName: name,
          playerCount: count,
          phase: 'players',
          // Pre-populate with default names so users only need to rename, not type from scratch
          players: Array.from({ length: count }, (_, i) => ({
            id: `p${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
            name: `Player ${i + 1}`,
          })),
        }),

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

          // Walk the winner forward through any BYE slots.
          // Stop when we hit a real opponent (both players present),
          // a pending peer (real match yet to be played), or the end of the bracket.
          let fromRound = currentRound
          let fromMatchIdx = currentMatchIndex
          let advancing = match.winner

          while (true) {
            const toRound = fromRound + 1
            if (toRound >= newBracket.length) break

            const toMatchIdx = Math.floor(fromMatchIdx / 2)
            const toSlot = fromMatchIdx % 2      // 0 → fills player1, 1 → fills player2
            const toMatch = newBracket[toRound][toMatchIdx]

            // Place the advancing player
            if (toSlot === 0) {
              toMatch.player1 = advancing
            } else {
              toMatch.player2 = advancing
            }

            // Check the peer feeding match in fromRound
            const peerIdx = toSlot === 0 ? toMatchIdx * 2 + 1 : toMatchIdx * 2
            const peer = newBracket[fromRound][peerIdx]

            if (peer.status !== 'completed') break  // real opponent still coming

            // Peer is resolved — check whether toMatch is a BYE
            const { player1: p1, player2: p2 } = toMatch
            if (p1 !== null && p2 === null) {
              toMatch.winner = p1
              toMatch.status = 'completed'
              advancing = p1
              fromRound = toRound
              fromMatchIdx = toMatchIdx
            } else if (p2 !== null && p1 === null) {
              toMatch.winner = p2
              toMatch.status = 'completed'
              advancing = p2
              fromRound = toRound
              fromMatchIdx = toMatchIdx
            } else {
              break  // real match (both slots filled) or both null — stop here
            }
          }

          // Determine championship by inspecting the final round's single match
          const finalMatch = newBracket[newBracket.length - 1][0]
          const isChampion = finalMatch.status === 'completed' && finalMatch.winner !== null

          return {
            bracket: newBracket,
            phase: isChampion ? 'champion' : 'bracket',
            champion: isChampion ? finalMatch.winner : state.champion,
          }
        })
      },

      goToBracket: () => set({ phase: 'bracket' }),

      goToPlayers: () => set({ phase: 'players' }),

      addPlayer: (name) =>
        set((state) => ({
          players: [
            ...state.players,
            { id: `p${Date.now()}_${Math.random().toString(36).slice(2)}`, name },
          ],
        })),

      updatePlayer: (id, name) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, name } : p)),
          bracket: state.bracket.map((round) =>
            round.map((match) => ({
              ...match,
              player1: match.player1?.id === id ? { ...match.player1, name } : match.player1,
              player2: match.player2?.id === id ? { ...match.player2, name } : match.player2,
              winner: match.winner?.id === id ? { ...match.winner, name } : match.winner,
            }))
          ),
          champion: state.champion?.id === id ? { ...state.champion, name } : state.champion,
        })),

      setPlayerPhoto: (id, photoUrl) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, photoUrl } : p)),
          bracket: state.bracket.map((round) =>
            round.map((match) => ({
              ...match,
              player1: match.player1?.id === id ? { ...match.player1, photoUrl } : match.player1,
              player2: match.player2?.id === id ? { ...match.player2, photoUrl } : match.player2,
              winner: match.winner?.id === id ? { ...match.winner, photoUrl } : match.winner,
            }))
          ),
          champion: state.champion?.id === id ? { ...state.champion, photoUrl } : state.champion,
        })),

      removePlayer: (id) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== id),
        })),

      reorderPlayers: (fromIndex, toIndex) =>
        set((state) => {
          const next = [...state.players]
          const [moved] = next.splice(fromIndex, 1)
          next.splice(toIndex, 0, moved)
          return { players: next }
        }),

      importPlayers: (names) =>
        set({
          players: names.map((name, i) => ({
            id: `p${Date.now()}_${i}`,
            name,
          })),
        }),

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
