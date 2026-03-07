import React, { useMemo } from 'react'
import {
  Bot, ListTodo, Zap, Activity, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, XCircle, Cpu, MemoryStick,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useStore } from '../../store/useStore'
import SystemMap from './SystemMap'
import ActivityFeed from './ActivityFeed'
import clsx from 'clsx'

export default function Dashboard() {
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const skills = useStore((s) => s.skills)
  const logs = useStore((s) => s.logs)
  const resourceHistory = useStore((s) => s.resourceHistory)
  const clawbotRunning = useStore((s) => s.clawbotRunning)

  const stats = useMemo(() => {
    const onlineAgents  = agents.filter((a) => a.status === 'online' || a.status === 'busy').length
    const errorAgents   = agents.filter((a) => a.status === 'error').length
    const runningTasks  = tasks.filter((t) => t.status === 'running').length
    const completeTasks = tasks.filter((t) => t.status === 'complete').length
    const failedTasks   = tasks.filter((t) => t.status === 'failed').length
    const installedSkills = skills.filter((s) => s.installed).length
    const totalTasks    = agents.reduce((sum, a) => sum + a.tasksCompleted, 0)
    const systemHealth  = errorAgents === 0
      ? 100
      : Math.round(((agents.length - errorAgents) / agents.length) * 100)
    return { onlineAgents, errorAgents, runningTasks, completeTasks, failedTasks, installedSkills, totalTasks, systemHealth }
  }, [agents, tasks, skills])

  const latest = resourceHistory[resourceHistory.length - 1] || { cpu: 0, mem: 0, net: 0 }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 mc-grid-bg">
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          icon={<Bot size={18} />}
          label="Active Agents"
          value={`${stats.onlineAgents}/${agents.length}`}
          sub={stats.errorAgents > 0 ? `${stats.errorAgents} error` : 'All healthy'}
          color="blue"
          alert={stats.errorAgents > 0}
        />
        <MetricCard
          icon={<ListTodo size={18} />}
          label="Running Tasks"
          value={stats.runningTasks}
          sub={`${stats.completeTasks} complete · ${stats.failedTasks} failed`}
          color="amber"
          alert={stats.failedTasks > 0}
        />
        <MetricCard
          icon={<Zap size={18} />}
          label="Skills Installed"
          value={stats.installedSkills}
          sub={`${skills.length - stats.installedSkills} available`}
          color="purple"
        />
        <MetricCard
          icon={<TrendingUp size={18} />}
          label="System Health"
          value={`${stats.systemHealth}%`}
          sub={clawbotRunning ? 'All systems nominal' : 'System offline'}
          color={stats.systemHealth === 100 ? 'green' : stats.systemHealth > 50 ? 'amber' : 'red'}
        />
      </div>

      {/* ── Row 2: System Map + Activity Feed ── */}
      <div className="grid grid-cols-5 gap-3" style={{ height: '280px' }}>
        <div className="col-span-3 mc-panel flex flex-col">
          <div className="mc-panel-header">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-mc-text">System Map</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={clsx('status-dot', clawbotRunning ? 'online' : 'offline')} />
              <span className="text-[10px] font-mono text-mc-muted">
                {clawbotRunning ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <SystemMap agents={agents} clawbotRunning={clawbotRunning} />
          </div>
        </div>

        <div className="col-span-2 mc-panel flex flex-col">
          <div className="mc-panel-header">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-mc-text">Activity Feed</span>
            </div>
            <span className="text-[10px] font-mono text-green-400 animate-pulse">● LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ActivityFeed logs={logs} agents={agents} />
          </div>
        </div>
      </div>

      {/* ── Row 3: Resource Charts + Task Status + Agent Quick-View ── */}
      <div className="grid grid-cols-5 gap-3" style={{ height: '240px' }}>
        {/* Resource charts */}
        <div className="col-span-3 mc-panel flex flex-col">
          <div className="mc-panel-header">
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-mc-text">Resource Monitor</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-blue-400">CPU {latest.cpu.toFixed(0)}%</span>
              <span className="text-purple-400">MEM {latest.mem.toFixed(0)}%</span>
              <span className="text-cyan-400">NET {latest.net.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex-1 px-2 pt-2 pb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resourceHistory} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0e1528', border: '1px solid #1a2744', borderRadius: '6px', fontSize: '11px' }}
                  labelStyle={{ color: '#64748b' }}
                  formatter={(v, n) => [`${v.toFixed(1)}%`, n.toUpperCase()]}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={1.5} fill="url(#cpuGrad)" name="cpu" dot={false} />
                <Area type="monotone" dataKey="mem" stroke="#a855f7" strokeWidth={1.5} fill="url(#memGrad)" name="mem" dot={false} />
                <Area type="monotone" dataKey="net" stroke="#06b6d4" strokeWidth={1.5} fill="url(#netGrad)" name="net" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task status panel */}
        <div className="col-span-2 mc-panel flex flex-col">
          <div className="mc-panel-header">
            <div className="flex items-center gap-2">
              <ListTodo size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-mc-text">Task Status</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2.5 py-1.5 border-b border-mc-border/50 last:border-0">
                <TaskStatusIcon status={task.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-mc-text font-medium truncate">{task.name}</div>
                  <div className="text-[10px] text-mc-muted">
                    Agent #{task.assignedAgentId} · {task.priority}
                  </div>
                </div>
                {task.status === 'running' && (
                  <div className="text-[10px] font-mono text-amber-400">{task.progress}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Agent Quick-view ── */}
      <div className="mc-panel">
        <div className="mc-panel-header">
          <div className="flex items-center gap-2">
            <Bot size={13} className="text-amber-400" />
            <span className="text-[12px] font-semibold text-mc-text">Agent Quick-View</span>
          </div>
        </div>
        <div className="p-3 grid grid-cols-5 gap-3">
          {agents.map((agent) => (
            <AgentQuickCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, color, alert }) {
  const colors = {
    blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  icon: 'text-blue-400',   val: 'text-blue-300' },
    amber:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  icon: 'text-amber-400',  val: 'text-amber-300' },
    green:  { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   icon: 'text-green-400',  val: 'text-green-300' },
    red:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   icon: 'text-red-400',    val: 'text-red-300' },
    purple: { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.25)',  icon: 'text-purple-400', val: 'text-purple-300' },
  }
  const c = colors[color] || colors.blue
  return (
    <div
      className="rounded-lg p-4 border mc-hover relative overflow-hidden"
      style={{ background: c.bg, borderColor: c.border }}
    >
      {alert && (
        <div className="absolute top-2 right-2">
          <AlertTriangle size={11} className="text-red-400 animate-pulse" />
        </div>
      )}
      <div className={clsx('mb-2', c.icon)}>{icon}</div>
      <div className={clsx('text-2xl font-bold font-mono mb-0.5', c.val)}>{value}</div>
      <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide">{label}</div>
      <div className="text-[10px] text-mc-subtle mt-1">{sub}</div>
    </div>
  )
}

function TaskStatusIcon({ status }) {
  const icons = {
    running: <Activity size={12} className="text-amber-400 animate-pulse" />,
    complete: <CheckCircle2 size={12} className="text-green-400" />,
    failed:  <XCircle size={12} className="text-red-400" />,
    pending: <Clock size={12} className="text-mc-muted" />,
  }
  return icons[status] || icons.pending
}

function AgentQuickCard({ agent }) {
  const statusColors = {
    online:  { dot: 'online',  ring: 'border-green-500/20',  bg: 'rgba(34,197,94,0.05)' },
    busy:    { dot: 'busy',    ring: 'border-amber-500/20',  bg: 'rgba(245,158,11,0.05)' },
    offline: { dot: 'offline', ring: 'border-mc-border',     bg: 'transparent' },
    error:   { dot: 'error',   ring: 'border-red-500/20',    bg: 'rgba(239,68,68,0.05)' },
  }
  const s = statusColors[agent.status] || statusColors.offline

  return (
    <div
      className={clsx('rounded-lg p-3 border', s.ring)}
      style={{ background: s.bg }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={clsx('status-dot', s.dot)} />
        <span className="text-[11px] font-semibold text-mc-text truncate">{agent.name}</span>
      </div>
      <div className="text-[10px] text-mc-muted truncate mb-2">
        {agent.currentTask || 'No active task'}
      </div>
      <div className="space-y-1">
        <MiniBar label="CPU" value={agent.cpu} color="#3b82f6" />
        <MiniBar label="MEM" value={agent.memory} color="#a855f7" />
      </div>
    </div>
  )
}

function MiniBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-mono text-mc-muted w-6">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-mc-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color, opacity: 0.8 }}
        />
      </div>
      <span className="text-[9px] font-mono w-6 text-right" style={{ color }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}
