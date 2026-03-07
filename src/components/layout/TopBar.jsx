import React, { useState } from 'react'
import {
  Power,
  AlertTriangle,
  Activity,
  Bell,
  Settings,
  Search,
  ChevronDown,
  Cpu,
  MemoryStick,
  Wifi,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

export default function TopBar() {
  const clawbotRunning = useStore((s) => s.clawbotRunning)
  const systemStatus = useStore((s) => s.systemStatus)
  const toggleSystem = useStore((s) => s.toggleSystem)
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const resourceHistory = useStore((s) => s.resourceHistory)
  const activeView = useStore((s) => s.activeView)

  const [showConfirm, setShowConfirm] = useState(false)

  const latest = resourceHistory[resourceHistory.length - 1] || { cpu: 0, mem: 0, net: 0 }
  const errorAgents = agents.filter((a) => a.status === 'error').length
  const runningTasks = tasks.filter((t) => t.status === 'running').length
  const failedTasks = tasks.filter((t) => t.status === 'failed').length

  const VIEW_LABELS = {
    dashboard: 'Dashboard',
    agents: 'Sub-Agents',
    tasks: 'Task Orchestrator',
    skills: 'ClaWHub — Skills',
    memory: 'Memory System',
    logs: 'Logs Console',
    team: 'Team',
    calendar: 'Calendar',
    content: 'Content',
  }

  const handlePower = () => {
    if (clawbotRunning) {
      setShowConfirm(true)
    } else {
      toggleSystem()
    }
  }

  return (
    <>
      <header className="flex items-center h-12 px-4 border-b border-mc-border bg-mc-deep shrink-0 gap-3">
        {/* Title */}
        <div className="flex items-center gap-2 mr-2">
          <span className="text-amber-400 text-[11px] font-mono font-semibold tracking-widest uppercase">
            ⚡ {VIEW_LABELS[activeView] || activeView}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-mc-border" />

        {/* System metrics */}
        <div className="flex items-center gap-3">
          <MetricPill
            icon={<Cpu size={10} />}
            label="CPU"
            value={`${latest.cpu.toFixed(0)}%`}
            color={latest.cpu > 80 ? 'red' : latest.cpu > 60 ? 'amber' : 'green'}
          />
          <MetricPill
            icon={<MemoryStick size={10} />}
            label="MEM"
            value={`${latest.mem.toFixed(0)}%`}
            color={latest.mem > 80 ? 'red' : latest.mem > 60 ? 'amber' : 'green'}
          />
          <MetricPill
            icon={<Wifi size={10} />}
            label="NET"
            value={`${latest.net.toFixed(0)}%`}
            color="blue"
          />
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-mc-border" />

        {/* Alerts */}
        {(errorAgents > 0 || failedTasks > 0) && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={11} className="text-red-400" />
            <span className="text-[11px] text-red-400 font-mono">
              {errorAgents > 0 && `${errorAgents} agent error${errorAgents > 1 ? 's' : ''}`}
              {errorAgents > 0 && failedTasks > 0 && ' · '}
              {failedTasks > 0 && `${failedTasks} task failed`}
            </span>
          </div>
        )}

        {/* Running tasks badge */}
        {runningTasks > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
            <Activity size={11} className="text-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-400 font-mono">
              {runningTasks} task{runningTasks > 1 ? 's' : ''} running
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date / time */}
        <LiveClock />

        {/* Separator */}
        <div className="h-4 w-px bg-mc-border" />

        {/* Notification bell */}
        <button className="btn-ghost relative">
          <Bell size={14} />
          {(errorAgents > 0 || failedTasks > 0) && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Settings */}
        <button className="btn-ghost">
          <Settings size={14} />
        </button>

        {/* Power button */}
        <button
          onClick={handlePower}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-semibold transition-all',
            clawbotRunning
              ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
          )}
        >
          <Power size={13} />
          {clawbotRunning ? 'Stop' : 'Start'}
        </button>
      </header>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div
            className="modal-box max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Power size={18} className="text-red-400" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-mc-text">Shut down ClawBot?</div>
                <div className="text-[12px] text-mc-muted">All agents will be stopped immediately.</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-danger text-[13px] px-4 py-2"
                onClick={() => { toggleSystem(); setShowConfirm(false) }}
              >
                Confirm Shutdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MetricPill({ icon, label, value, color }) {
  const colors = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  }
  return (
    <div className="flex items-center gap-1 text-[11px] font-mono">
      <span className={clsx('text-mc-muted', colors[color])}>{icon}</span>
      <span className="text-mc-muted">{label}</span>
      <span className={clsx('font-semibold', colors[color])}>{value}</span>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = React.useState(new Date())
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className="text-[11px] font-mono text-mc-muted">
      {time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
      {' '}
      <span className="text-mc-text font-semibold">
        {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
      </span>
    </div>
  )
}
