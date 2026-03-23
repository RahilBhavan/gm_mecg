import { ComparisonTray } from '@/components/ComparisonTray'
import { LeftPanel } from '@/components/LeftPanel'
import { NavBar } from '@/components/NavBar'
import { RightPanel } from '@/components/RightPanel'
import { DashboardProvider } from '@/context/DashboardContext'

import './App.css'

function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <LeftPanel />
        <RightPanel />
      </div>
      <ComparisonTray />
    </div>
  )
}

export default function App() {
  return (
    <DashboardProvider>
      <AppShell />
    </DashboardProvider>
  )
}
