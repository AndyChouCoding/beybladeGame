'use client'
import dynamic from 'next/dynamic'
import { useTournamentStore } from '@/store/tournamentStore'

const TournamentTabs  = dynamic(() => import('@/components/ui/TournamentTabs'),        { ssr: false })
const SetupScreen     = dynamic(() => import('@/components/screens/SetupScreen'),       { ssr: false })
const PlayersScreen   = dynamic(() => import('@/components/screens/PlayersScreen'),     { ssr: false })
const BracketScreen   = dynamic(() => import('@/components/screens/BracketScreen'),     { ssr: false })
const MatchScreen     = dynamic(() => import('@/components/screens/MatchScreen'),       { ssr: false })
const ChampionScreen  = dynamic(() => import('@/components/screens/ChampionScreen'),   { ssr: false })

export default function Home() {
  const phase = useTournamentStore((s) => s.phase)

  return (
    <main
      className="flex-1 flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', height: '100dvh' }}
    >
      <TournamentTabs />
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        {phase === 'setup'    && <SetupScreen />}
        {phase === 'players'  && <PlayersScreen />}
        {phase === 'bracket'  && <BracketScreen />}
        {phase === 'match'    && <MatchScreen />}
        {phase === 'champion' && <ChampionScreen />}
      </div>
    </main>
  )
}
