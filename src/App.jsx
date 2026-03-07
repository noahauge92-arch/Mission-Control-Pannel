import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import AgentManager from './components/agents/AgentManager'
import SkillsHub from './components/skills/SkillsHub'
import TaskOrchestrator from './components/tasks/TaskOrchestrator'
import MemorySystem from './components/memory/MemorySystem'
import LogsConsole from './components/logs/LogsConsole'
import ComingSoon from './components/shared/ComingSoon'

const LOG_MESSAGES = [
  { agentId: 1, agent: 'ResearchBot Alpha', level: 'info',    message: 'Scanning source: techcrunch.com...' },
  { agentId: 2, agent: 'CodeBot Beta',      level: 'info',    message: 'Module 6/12 refactoring in progress...' },
  { agentId: 3, agent: 'DataBot Gamma',     level: 'success', message: 'Batch processed: 500 records normalized' },
  { agentId: null, agent: 'System',          level: 'info',    message: 'Memory checkpoint saved — all agents' },
  { agentId: 1, agent: 'ResearchBot Alpha', level: 'success', message: 'New insight extracted: market share data' },
  { agentId: 2, agent: 'CodeBot Beta',      level: 'warning', message: 'High memory usage detected: 78% — monitoring' },
  { agentId: 3, agent: 'DataBot Gamma',     level: 'info',    message: 'Running validation on finance_q4.csv...' },
  { agentId: null, agent: 'System',          level: 'info',    message: 'Uptime tick: all agents healthy' },
  { agentId: 2, agent: 'CodeBot Beta',      level: 'info',    message: 'Executing test suite: 47 tests...' },
  { agentId: 1, agent: 'ResearchBot Alpha', level: 'info',    message: 'Fetching URL: bloomberg.com/markets...' },
]

export default function App() {
  const activeView = useStore((s) => s.activeView)
  const clawbotRunning = useStore((s) => s.clawbotRunning)
  const tickUptime = useStore((s) => s.tickUptime)
  const tickAgentMetrics = useStore((s) => s.tickAgentMetrics)
  const tickResourceHistory = useStore((s) => s.tickResourceHistory)
  const addLog = useStore((s) => s.addLog)

  // Global simulation tick
  useEffect(() => {
    if (!clawbotRunning) return

    const uptimeTimer = setInterval(tickUptime, 1000)
    const metricsTimer = setInterval(tickAgentMetrics, 2000)
    const resourceTimer = setInterval(tickResourceHistory, 3000)

    let logIdx = 0
    const logTimer = setInterval(() => {
      addLog(LOG_MESSAGES[logIdx % LOG_MESSAGES.length])
      logIdx++
    }, 8000)

    return () => {
      clearInterval(uptimeTimer)
      clearInterval(metricsTimer)
      clearInterval(resourceTimer)
      clearInterval(logTimer)
    }
  }, [clawbotRunning])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />
      case 'agents':    return <AgentManager />
      case 'tasks':     return <TaskOrchestrator />
      case 'skills':    return <SkillsHub />
      case 'memory':    return <MemorySystem />
      case 'logs':      return <LogsConsole />
      default:          return <ComingSoon view={activeView} />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-mc-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
