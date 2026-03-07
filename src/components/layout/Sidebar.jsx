import React from 'react'
import {
  LayoutDashboard,
  Bot,
  Zap,
  ListTodo,
  Brain,
  ScrollText,
  Users,
  Calendar,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, badge: null },
  { id: 'agents',     label: 'Sub-Agents',  icon: Bot,             badge: 'agents' },
  { id: 'tasks',      label: 'Tasks',       icon: ListTodo,        badge: 'tasks' },
  { id: 'skills',     label: 'Skills',      icon: Zap,             badge: 'skills' },
  { id: 'memory',     label: 'Memory',      icon: Brain,           badge: null },
  { id: 'logs',       label: 'Logs',        icon: ScrollText,      badge: 'logs' },
  { id: 'team',       label: 'Team',        icon: Users,           badge: null },
  { id: 'calendar',   label: 'Calendar',    icon: Calendar,        badge: null },
  { id: 'content',    label: 'Content',     icon: FileText,        badge: null },
]

function getBadgeCount(id, { agents, tasks, skills, logs }) {
  switch (id) {
    case 'agents': {
      const errors = agents.filter((a) => a.status === 'error').length
      return errors > 0 ? errors : null
    }
    case 'tasks': {
      const running = tasks.filter((t) => t.status === 'running').length
      return running > 0 ? running : null
    }
    case 'skills': {
      const installed = skills.filter((s) => s.installed).length
      return installed
    }
    case 'logs': {
      const errors = logs.filter((l) => l.level === 'error').length
      return errors > 0 ? errors : null
    }
    default:
      return null
  }
}

export default function Sidebar() {
  const activeView = useStore((s) => s.activeView)
  const setActiveView = useStore((s) => s.setActiveView)
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const skills = useStore((s) => s.skills)
  const logs = useStore((s) => s.logs)
  const clawbotRunning = useStore((s) => s.clawbotRunning)
  const uptimeSeconds = useStore((s) => s.uptimeSeconds)

  const fmtUptime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const onlineAgents = agents.filter((a) => a.status === 'online' || a.status === 'busy').length

  return (
    <aside className="flex flex-col w-[200px] shrink-0 h-full border-r border-mc-border bg-mc-deep">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-mc-border">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-base">
          ⚡
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-mc-text leading-tight">Mission Control</div>
          <div className="text-[10px] text-mc-muted font-mono leading-tight">ClawBot System</div>
        </div>
      </div>

      {/* System status mini */}
      <div className="mx-3 my-2.5 rounded-md bg-mc-panel border border-mc-border p-2.5">
        <div className="flex items-center gap-2 mb-1">
          <span className={clsx('status-dot', clawbotRunning ? 'online' : 'offline')} />
          <span className="text-[11px] font-semibold text-mc-text">
            {clawbotRunning ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
          </span>
        </div>
        <div className="text-[10px] text-mc-muted font-mono">
          {clawbotRunning ? `UP ${fmtUptime(uptimeSeconds)}` : 'All agents halted'}
        </div>
        <div className="text-[10px] text-mc-muted mt-0.5">
          {onlineAgents}/{agents.length} agents active
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const count = getBadgeCount(item.badge, { agents, tasks, skills, logs })
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 mb-0.5 group',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-mc-muted hover:text-mc-text hover:bg-mc-panel'
              )}
            >
              <Icon
                size={14}
                className={clsx(
                  'shrink-0 transition-colors',
                  isActive ? 'text-amber-400' : 'text-mc-muted group-hover:text-mc-text'
                )}
              />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {count !== null && (
                <span
                  className={clsx(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none',
                    item.id === 'agents' && count > 0
                      ? 'bg-red-500/20 text-red-400'
                      : item.id === 'logs' && count > 0
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <ChevronRight size={10} className="text-amber-400 shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-3 py-3 border-t border-mc-border">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="status-dot online" />
          <span className="text-[10px] text-mc-muted">All systems nominal</span>
        </div>
        <div className="text-[10px] text-mc-subtle font-mono">v1.0.0 — ClawBot Core</div>
      </div>
    </aside>
  )
}
