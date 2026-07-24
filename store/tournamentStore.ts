import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Player, Match, Bracket, Phase, TournamentState } from '@/types'
import { generateBracket } from '@/utils/bracket'

const INITIAL_ID = 't0'

function makeId() {
  return `t${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function getMatchLoser(m: Match): Player | null {
  if (!m.winner) return null
  return m.player1 && m.winner.id === m.player1.id ? m.player2 : m.player1
}

function defaultData(): Omit<TournamentState, 'id'> {
  return {
    tournamentName: '',
    playerCount: 4,
    players: [],
    bracket: [],
    currentRound: 0,
    currentMatchIndex: 0,
    phase: 'setup',
    champion: null,
    thirdPlaceMatch: null,
    runnerUp: null,
    thirdPlace: null,
  }
}

const INITIAL_TOURNAMENT: TournamentState = { id: INITIAL_ID, ...defaultData() }

type FlatState = {
  activeTournamentId: string
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

function snap(s: FlatState): TournamentState {
  return {
    id: s.activeTournamentId,
    tournamentName: s.tournamentName,
    playerCount: s.playerCount,
    players: s.players,
    bracket: s.bracket,
    currentRound: s.currentRound,
    currentMatchIndex: s.currentMatchIndex,
    phase: s.phase,
    champion: s.champion,
    thirdPlaceMatch: s.thirdPlaceMatch,
    runnerUp: s.runnerUp,
    thirdPlace: s.thirdPlace,
  }
}

function flat(t: TournamentState): Omit<TournamentState, 'id'> {
  return {
    tournamentName: t.tournamentName,
    playerCount: t.playerCount,
    players: t.players,
    bracket: t.bracket,
    currentRound: t.currentRound,
    currentMatchIndex: t.currentMatchIndex,
    phase: t.phase,
    champion: t.champion,
    thirdPlaceMatch: t.thirdPlaceMatch,
    runnerUp: t.runnerUp,
    thirdPlace: t.thirdPlace,
  }
}

interface TournamentStore {
  // Active tournament (flat)
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

  // Multi-tournament
  activeTournamentId: string
  tournaments: Record<string, TournamentState>

  // Existing actions
  setSetup: (name: string, count: number) => void
  setPlayers: (players: Player[]) => void
  initBracket: () => void
  startMatch: (round: number, matchIndex: number) => void
  startThirdPlaceMatch: () => void
  resolveThirdPlaceBye: () => void
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
  importPlayersFromSheet: (entries: { name: string; photoUrl?: string }[]) => void
  clearPlayers: () => void

  // Multi-tournament actions
  createTournament: () => void
  createMixedTournament: (name: string, players: Player[]) => void
  switchTournament: (id: string) => void
  deleteTournament: (id: string) => void
}

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      ...defaultData(),
      activeTournamentId: INITIAL_ID,
      tournaments: { [INITIAL_ID]: INITIAL_TOURNAMENT },

      setSetup: (name, count) =>
        set((state) => ({
          tournamentName: name,
          playerCount: count,
          phase: 'players',
          players:
            state.players.length > 0
              ? state.players
              : Array.from({ length: count }, (_, i) => ({
                  id: `p${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                  name: `Player ${i + 1}`,
                })),
        })),

      setPlayers: (players) => set({ players }),

      initBracket: () => {
        const { players } = get()
        const bracket = generateBracket(players)
        set({
          bracket,
          phase: 'bracket',
          champion: null,
          thirdPlaceMatch: null,
          runnerUp: null,
          thirdPlace: null,
        })
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

      startThirdPlaceMatch: () => {
        set((state) => {
          if (!state.thirdPlaceMatch) return {}
          return {
            thirdPlaceMatch: { ...state.thirdPlaceMatch, status: 'active' },
            currentRound: -1,
            currentMatchIndex: 0,
            phase: 'match',
          }
        })
      },

      resolveThirdPlaceBye: () => {
        set((state) => {
          if (!state.thirdPlaceMatch) return {}
          const winner = state.thirdPlaceMatch.player1 ?? state.thirdPlaceMatch.player2
          return {
            thirdPlaceMatch: { ...state.thirdPlaceMatch, winner, status: 'completed' },
          }
        })
      },

      addScore: (player) => {
        set((state) => {
          if (state.currentRound === -1) {
            if (!state.thirdPlaceMatch) return {}
            const match = { ...state.thirdPlaceMatch }
            if (player === 1 && match.score1 < 4) match.score1++
            if (player === 2 && match.score2 < 4) match.score2++
            return { thirdPlaceMatch: match }
          }
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
          if (state.currentRound === -1) {
            if (!state.thirdPlaceMatch) return {}
            const match = { ...state.thirdPlaceMatch }
            if (player === 1 && match.score1 > 0) match.score1--
            if (player === 2 && match.score2 > 0) match.score2--
            return { thirdPlaceMatch: match }
          }
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
          if (state.currentRound === -1) {
            if (!state.thirdPlaceMatch) return {}
            const match = { ...state.thirdPlaceMatch }
            match.winner = winner === 1 ? match.player1 : match.player2
            match.status = 'completed'
            return { thirdPlaceMatch: match, phase: 'bracket' }
          }

          const { currentRound, currentMatchIndex } = state
          const newBracket = state.bracket.map((r) => r.map((m) => ({ ...m })))
          const match = newBracket[currentRound][currentMatchIndex]

          match.winner = winner === 1 ? match.player1 : match.player2
          match.status = 'completed'

          let fromRound = currentRound
          let fromMatchIdx = currentMatchIndex
          let advancing = match.winner

          while (true) {
            const toRound = fromRound + 1
            if (toRound >= newBracket.length) break

            const toMatchIdx = Math.floor(fromMatchIdx / 2)
            const toSlot = fromMatchIdx % 2
            const toMatch = newBracket[toRound][toMatchIdx]

            if (toSlot === 0) {
              toMatch.player1 = advancing
            } else {
              toMatch.player2 = advancing
            }

            const peerIdx = toSlot === 0 ? toMatchIdx * 2 + 1 : toMatchIdx * 2
            const peer = newBracket[fromRound][peerIdx]

            if (peer.status !== 'completed') break

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
              break
            }
          }

          // Once both semifinals are resolved, derive the 3rd/4th place match from their losers.
          let thirdPlaceMatch = state.thirdPlaceMatch
          const semifinalRound = newBracket.length - 2
          if (
            !thirdPlaceMatch &&
            semifinalRound >= 0 &&
            newBracket[semifinalRound][0]?.status === 'completed' &&
            newBracket[semifinalRound][1]?.status === 'completed'
          ) {
            const sf0 = newBracket[semifinalRound][0]
            const sf1 = newBracket[semifinalRound][1]
            thirdPlaceMatch = {
              id: 'third-place',
              round: -1,
              matchIndex: 0,
              player1: getMatchLoser(sf0),
              player2: getMatchLoser(sf1),
              score1: 0,
              score2: 0,
              winner: null,
              status: 'pending',
            }
          }

          const finalMatch = newBracket[newBracket.length - 1][0]
          const isChampion = finalMatch.status === 'completed' && finalMatch.winner !== null

          let runnerUp = state.runnerUp
          let thirdPlace = state.thirdPlace
          if (isChampion) {
            runnerUp = getMatchLoser(finalMatch)
            thirdPlace = thirdPlaceMatch?.winner ?? null
          }

          return {
            bracket: newBracket,
            thirdPlaceMatch,
            phase: isChampion ? 'champion' : 'bracket',
            champion: isChampion ? finalMatch.winner : state.champion,
            runnerUp,
            thirdPlace,
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
          thirdPlaceMatch: state.thirdPlaceMatch
            ? {
                ...state.thirdPlaceMatch,
                player1:
                  state.thirdPlaceMatch.player1?.id === id
                    ? { ...state.thirdPlaceMatch.player1, name }
                    : state.thirdPlaceMatch.player1,
                player2:
                  state.thirdPlaceMatch.player2?.id === id
                    ? { ...state.thirdPlaceMatch.player2, name }
                    : state.thirdPlaceMatch.player2,
                winner:
                  state.thirdPlaceMatch.winner?.id === id
                    ? { ...state.thirdPlaceMatch.winner, name }
                    : state.thirdPlaceMatch.winner,
              }
            : state.thirdPlaceMatch,
          champion: state.champion?.id === id ? { ...state.champion, name } : state.champion,
          runnerUp: state.runnerUp?.id === id ? { ...state.runnerUp, name } : state.runnerUp,
          thirdPlace: state.thirdPlace?.id === id ? { ...state.thirdPlace, name } : state.thirdPlace,
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
          thirdPlaceMatch: state.thirdPlaceMatch
            ? {
                ...state.thirdPlaceMatch,
                player1:
                  state.thirdPlaceMatch.player1?.id === id
                    ? { ...state.thirdPlaceMatch.player1, photoUrl }
                    : state.thirdPlaceMatch.player1,
                player2:
                  state.thirdPlaceMatch.player2?.id === id
                    ? { ...state.thirdPlaceMatch.player2, photoUrl }
                    : state.thirdPlaceMatch.player2,
                winner:
                  state.thirdPlaceMatch.winner?.id === id
                    ? { ...state.thirdPlaceMatch.winner, photoUrl }
                    : state.thirdPlaceMatch.winner,
              }
            : state.thirdPlaceMatch,
          champion: state.champion?.id === id ? { ...state.champion, photoUrl } : state.champion,
          runnerUp: state.runnerUp?.id === id ? { ...state.runnerUp, photoUrl } : state.runnerUp,
          thirdPlace:
            state.thirdPlace?.id === id ? { ...state.thirdPlace, photoUrl } : state.thirdPlace,
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

      importPlayersFromSheet: (entries) =>
        set({
          players: entries.map((entry, i) => ({
            id: `p${Date.now()}_${i}`,
            name: entry.name,
            photoUrl: entry.photoUrl,
          })),
        }),

      reset: () =>
        set((state) => ({
          players: state.players,
          tournamentName: '',
          playerCount: 4,
          bracket: [],
          currentRound: 0,
          currentMatchIndex: 0,
          phase: 'setup',
          champion: null,
          thirdPlaceMatch: null,
          runnerUp: null,
          thirdPlace: null,
        })),

      clearPlayers: () => set({ players: [] }),

      // ── Multi-tournament ──

      createTournament: () =>
        set((state) => {
          const newId = makeId()
          const snapshot = snap(state)
          const data = defaultData()
          const newT: TournamentState = { id: newId, ...data }
          return {
            tournaments: {
              ...state.tournaments,
              [state.activeTournamentId]: snapshot,
              [newId]: newT,
            },
            activeTournamentId: newId,
            ...data,
          }
        }),

      createMixedTournament: (name, players) =>
        set((state) => {
          const newId = makeId()
          const snapshot = snap(state)
          const newT: TournamentState = {
            id: newId,
            tournamentName: name,
            playerCount: players.length,
            players,
            bracket: [],
            currentRound: 0,
            currentMatchIndex: 0,
            phase: 'players',
            champion: null,
            thirdPlaceMatch: null,
            runnerUp: null,
            thirdPlace: null,
          }
          return {
            tournaments: {
              ...state.tournaments,
              [state.activeTournamentId]: snapshot,
              [newId]: newT,
            },
            activeTournamentId: newId,
            ...flat(newT),
          }
        }),

      switchTournament: (id) =>
        set((state) => {
          if (id === state.activeTournamentId) return {}
          const snapshot = snap(state)
          const target = state.tournaments[id]
          return {
            tournaments: { ...state.tournaments, [state.activeTournamentId]: snapshot },
            activeTournamentId: id,
            ...flat(target),
          }
        }),

      deleteTournament: (id) =>
        set((state) => {
          const ids = Object.keys(state.tournaments)
          if (ids.length <= 1) return {}

          const next = { ...state.tournaments }
          delete next[id]

          if (id !== state.activeTournamentId) {
            return { tournaments: next }
          }

          const nextId = Object.keys(next)[0]
          return {
            tournaments: next,
            activeTournamentId: nextId,
            ...flat(next[nextId]),
          }
        }),
    }),
    { name: 'gyro-battle-store-v2' }
  )
)
