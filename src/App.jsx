import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import SkillsHub from './components/skills/SkillsHub'
import Workspace from './components/workspace/Workspace'
import TaskManager from './components/tasks/TaskManager'
import ComingSoon from './components/shared/ComingSoon'

const POLL_MS = 30_000

export default function App() {
  const setAlfred          = useStore((s) => s.setAlfred)
  const setAlfredAnalytics = useStore((s) => s.setAlfredAnalytics)
  const setAlfredLogs      = useStore((s) => s.setAlfredLogs)
  const setAlfredError     = useStore((s) => s.setAlfredError)
  const tickUptime         = useStore((s) => s.tickUptime)
  const activeView         = useStore((s) => s.activeView)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [stateRes, analyticsRes, logsRes] = await Promise.all([
          fetch('/api/alfred'),
          fetch('/api/alfred/analytics'),
          fetch('/api/alfred/logs'),
        ])
        setAlfred(await stateRes.json())
        setAlfredAnalytics(await analyticsRes.json())
        const logsData = await logsRes.json()
        if (Array.isArray(logsData.lines)) setAlfredLogs(logsData.lines)
      } catch (err) {
        setAlfredError(`Cannot reach Alfred server: ${err.message}`)
      }
    }
    fetchAll()
    const poll = setInterval(fetchAll, POLL_MS)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    const id = setInterval(tickUptime, 1000)
    return () => clearInterval(id)
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':  return <Dashboard />
      case 'workspace':  return <Workspace />
      case 'tasks':      return <TaskManager />
      case 'skills':     return <SkillsHub />
      default:           return <ComingSoon view={activeView} />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-mc-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">{renderView()}</main>
      </div>
    </div>
  )
}
