import React, { useState } from 'react'
import {
  Plus, Bot, Activity, Cpu, MemoryStick, CheckCircle2,
  Power, Trash2, Eye, ChevronRight, AlertCircle, Clock,
  Settings, Zap,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import CreateAgentModal from './CreateAgentModal'
import AgentDetailModal from './AgentDetailModal'
import clsx from 'clsx'

const STATUS_CONFIG = {
  online:  { label: 'Online',  dot: 'online',  badge: 'tag-green',  color: '#22c55e' },
  busy:    { label: 'Busy',    dot: 'busy',    badge: 'tag-amber',  color: '#f59e0b' },
  offline: { label: 'Offline', dot: 'offline', badge: 'tag-gray',   color: '#64748b' },
  error:   { label: 'Error',   dot: 'error',   badge: 'tag-red',    color: '#ef4444' },
}

const TYPE_CONFIG = {
  research:    { label: 'Research',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  development: { label: 'Development', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  analytics:   { label: 'Analytics',  color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  marketing:   { label: 'Marketing',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  creative:    { label: 'Creative',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function AgentManager() {
  const agents = useStore((s) => s.agents)
  const skills = useStore((s) => s.skills)
  const tasks  = useStore((s) => s.tasks)
  const toggleAgentStatus = useStore((s) => s.toggleAgentStatus)
  const removeAgent = useStore((s) => s.removeAgent)

  const [showCreate, setShowCreate] = useState(false)
  const [detailAgent, setDetailAgent] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = agents.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (filterType   !== 'all' && a.type   !== filterType)   return false
    return true
  })

  const statCounts = {
    online:  agents.filter((a) => a.status === 'online').length,
    busy:    agents.filter((a) => a.status === 'busy').length,
    offline: agents.filter((a) => a.status === 'offline').length,
    error:   agents.filter((a) => a.status === 'error').length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-amber-400" />
            <span className="text-[14px] font-semibold text-mc-text">Sub-Agents</span>
            <span className="tag tag-amber ml-1">{agents.length} total</span>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-mc-panel border border-mc-border rounded-md p-0.5">
            {['all', 'online', 'busy', 'offline', 'error'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={clsx(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-all capitalize',
                  filterStatus === s
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-mc-muted hover:text-mc-text'
                )}
              >
                {s === 'all' ? `All (${agents.length})` : `${s} (${statCounts[s]})`}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={13} />
          New Agent
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-px shrink-0 border-b border-mc-border">
        {[
          { label: 'Online',  value: statCounts.online,  color: '#22c55e' },
          { label: 'Busy',    value: statCounts.busy,    color: '#f59e0b' },
          { label: 'Offline', value: statCounts.offline, color: '#64748b' },
          { label: 'Error',   value: statCounts.error,   color: '#ef4444', alert: statCounts.error > 0 },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-mc-deep">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px] text-mc-muted">{s.label}</span>
            <span
              className={clsx(
                'text-[14px] font-bold font-mono ml-auto',
                s.alert ? 'text-red-400 animate-pulse' : 'text-mc-text'
              )}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot size={40} className="text-mc-border mx-auto mb-3" />
              <div className="text-mc-muted text-sm">No agents match your filters</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                tasks={tasks}
                skills={skills}
                onToggle={() => toggleAgentStatus(agent.id)}
                onDelete={() => setConfirmDelete(agent)}
                onView={() => setDetailAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateAgentModal onClose={() => setShowCreate(false)} />}
      {detailAgent && (
        <AgentDetailModal
          agent={detailAgent}
          tasks={tasks}
          skills={skills}
          onClose={() => setDetailAgent(null)}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-mc-text">Delete agent?</div>
                <div className="text-[12px] text-mc-muted">{confirmDelete.name}</div>
              </div>
            </div>
            <p className="text-[12px] text-mc-muted mb-4">
              This will permanently remove the agent and all its task assignments.
            </p>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn-danger text-[13px] px-4 py-2"
                onClick={() => { removeAgent(confirmDelete.id); setConfirmDelete(null) }}
              >
                Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AgentCard ────────────────────────────────────────────────────────────────
function AgentCard({ agent, tasks, skills, onToggle, onDelete, onView }) {
  const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline
  const tc = TYPE_CONFIG[agent.type] || TYPE_CONFIG.research

  const agentTasks = tasks.filter((t) => t.assignedAgentId === agent.id)
  const agentSkills = skills.filter((s) => agent.skills.includes(s.id))
  const isActive = agent.status === 'online' || agent.status === 'busy'

  return (
    <div
      className={clsx(
        'mc-panel mc-hover flex flex-col overflow-hidden cursor-pointer',
        agent.status === 'error' && 'border-red-500/30'
      )}
      onClick={onView}
    >
      {/* Card header */}
      <div className="p-4 pb-3 border-b border-mc-border/50">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            {/* Agent avatar */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0 border"
              style={{ background: tc.bg, borderColor: `${tc.color}30` }}
            >
              {agent.icon}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-mc-text leading-tight">{agent.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="tag" style={{ background: tc.bg, color: tc.color, borderColor: `${tc.color}30` }}>
                  {tc.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={clsx('status-dot', sc.dot)} />
            <span className={clsx('tag', sc.badge)}>{sc.label}</span>
          </div>
        </div>

        <p className="text-[11px] text-mc-muted leading-snug">{agent.description}</p>

        {/* Current task */}
        {agent.currentTask && (
          <div className={clsx(
            'mt-2 px-2 py-1.5 rounded text-[10px] flex items-center gap-1.5',
            agent.status === 'error'
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
          )}>
            {agent.status === 'error' ? (
              <AlertCircle size={10} className="shrink-0" />
            ) : (
              <Activity size={10} className="shrink-0 animate-pulse" />
            )}
            <span className="truncate font-mono">{agent.currentTask}</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 border-b border-mc-border/50">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStat label="Tasks Done" value={agent.tasksCompleted} icon={<CheckCircle2 size={10} />} color="green" />
          <MiniStat label="Uptime"     value={isActive ? agent.uptime : '—'} icon={<Clock size={10} />} color="blue" />
          <MiniStat label="Skills"     value={agentSkills.length} icon={<Zap size={10} />} color="purple" />
        </div>

        <div className="space-y-2">
          <ResourceBar label="CPU" value={agent.cpu} color="#3b82f6" />
          <ResourceBar label="MEM" value={agent.memory} color="#a855f7" />
        </div>
      </div>

      {/* Skills */}
      <div className="px-4 py-3 border-b border-mc-border/50">
        <div className="text-[10px] text-mc-muted font-semibold uppercase tracking-wide mb-1.5">Skills</div>
        <div className="flex flex-wrap gap-1">
          {agentSkills.slice(0, 4).map((skill) => (
            <span
              key={skill.id}
              className="tag tag-gray text-[9px]"
              title={skill.name}
            >
              {skill.icon} {skill.name}
            </span>
          ))}
          {agentSkills.length > 4 && (
            <span className="tag tag-gray text-[9px]">+{agentSkills.length - 4} more</span>
          )}
          {agentSkills.length === 0 && (
            <span className="text-[10px] text-mc-subtle">No skills assigned</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggle}
          className={clsx(
            'flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition-all',
            isActive
              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
          )}
        >
          <Power size={11} />
          {isActive ? 'Stop' : 'Start'}
        </button>

        <button className="btn-ghost" onClick={onView}>
          <Eye size={12} />
          View
        </button>

        <button className="btn-ghost ml-auto" onClick={onDelete}>
          <Trash2 size={11} className="text-red-400/60" />
        </button>
      </div>
    </div>
  )
}

function MiniStat({ label, value, icon, color }) {
  const colors = { green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400' }
  return (
    <div className="text-center">
      <div className={clsx('flex items-center justify-center gap-1 mb-0.5', colors[color])}>
        {icon}
        <span className="text-[12px] font-bold font-mono">{value}</span>
      </div>
      <div className="text-[9px] text-mc-subtle uppercase tracking-wide">{label}</div>
    </div>
  )
}

function ResourceBar({ label, value, color }) {
  const pct = Math.min(100, Math.max(0, value))
  const alertColor = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : color
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-mc-muted w-7">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-mc-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: alertColor }}
        />
      </div>
      <span className="text-[10px] font-mono w-7 text-right" style={{ color: alertColor }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}
