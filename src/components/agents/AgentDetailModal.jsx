import React, { useState } from 'react'
import {
  X, Activity, Cpu, MemoryStick, Clock, CheckCircle2,
  ListTodo, Zap, Brain, AlertCircle,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const STATUS_CONFIG = {
  online:  { dot: 'online',  color: '#22c55e', label: 'Online' },
  busy:    { dot: 'busy',    color: '#f59e0b', label: 'Busy' },
  offline: { dot: 'offline', color: '#64748b', label: 'Offline' },
  error:   { dot: 'error',   color: '#ef4444', label: 'Error' },
}

export default function AgentDetailModal({ agent, tasks, skills, onClose }) {
  const memories = useStore((s) => s.memories)
  const [tab, setTab] = useState('overview')

  const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline
  const agentTasks = tasks.filter((t) => t.assignedAgentId === agent.id)
  const agentSkills = skills.filter((s) => agent.skills.includes(s.id))
  const agentMemories = memories.filter((m) => m.agentId === agent.id)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '680px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl border"
              style={{ background: `${sc.color}15`, borderColor: `${sc.color}30` }}
            >
              {agent.icon}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-mc-text">{agent.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={clsx('status-dot', sc.dot)} />
                <span className="text-[11px]" style={{ color: sc.color }}>{sc.label}</span>
                <span className="text-mc-subtle text-[11px]">·</span>
                <span className="text-[11px] text-mc-muted capitalize">{agent.type}</span>
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-mc-border px-4">
          {['overview', 'tasks', 'skills', 'memory'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-3 py-2.5 text-[12px] font-medium capitalize border-b-2 transition-colors',
                tab === t
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-mc-muted hover:text-mc-text'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 max-h-96 overflow-y-auto">
          {tab === 'overview' && (
            <div className="space-y-4">
              <p className="text-[12px] text-mc-muted">{agent.description}</p>

              {agent.currentTask && (
                <div className={clsx(
                  'p-3 rounded-lg border text-[11px] flex items-start gap-2',
                  agent.status === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                )}>
                  {agent.status === 'error'
                    ? <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    : <Activity size={13} className="shrink-0 mt-0.5 animate-pulse" />
                  }
                  {agent.currentTask}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Tasks Completed', value: agent.tasksCompleted, icon: <CheckCircle2 size={14} className="text-green-400" /> },
                  { label: 'Uptime',           value: agent.uptime,         icon: <Clock size={14} className="text-blue-400" /> },
                  { label: 'Skills Active',    value: agentSkills.length,   icon: <Zap size={14} className="text-purple-400" /> },
                ].map((s) => (
                  <div key={s.label} className="bg-mc-panel border border-mc-border rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1">{s.icon}</div>
                    <div className="text-[16px] font-bold font-mono text-mc-text">{s.value}</div>
                    <div className="text-[9px] text-mc-muted uppercase tracking-wide mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <ResourceRow label="CPU Usage"    value={agent.cpu}    color="#3b82f6" />
                <ResourceRow label="Memory Usage" value={agent.memory} color="#a855f7" />
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-2">
              {agentTasks.length === 0 ? (
                <div className="text-center py-8 text-mc-muted text-sm">No tasks assigned</div>
              ) : (
                agentTasks.map((task) => (
                  <div key={task.id} className="bg-mc-panel border border-mc-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium text-mc-text">{task.name}</span>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="text-[11px] text-mc-muted mb-2">{task.description}</p>
                    {task.status === 'running' && (
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${task.progress}%`, background: '#f59e0b' }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'skills' && (
            <div className="space-y-2">
              {agentSkills.length === 0 ? (
                <div className="text-center py-8 text-mc-muted text-sm">No skills assigned</div>
              ) : (
                agentSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-3 bg-mc-panel border border-mc-border rounded-lg p-3">
                    <span className="text-xl">{skill.icon}</span>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium text-mc-text">{skill.name}</div>
                      <div className="text-[10px] text-mc-muted">{skill.description}</div>
                    </div>
                    <span className="text-[10px] font-mono text-mc-subtle">{skill.version}</span>
                    <span className="tag tag-green text-[9px]">Active</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'memory' && (
            <div className="space-y-2">
              {agentMemories.length === 0 ? (
                <div className="text-center py-8 text-mc-muted text-sm">No memories stored</div>
              ) : (
                agentMemories.map((mem) => (
                  <div key={mem.id} className="bg-mc-panel border border-mc-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium text-mc-text">{mem.title}</span>
                      <span className={clsx('tag text-[9px]', {
                        episodic: 'tag-blue',
                        semantic: 'tag-purple',
                        working:  'tag-amber',
                      }[mem.type] || 'tag-gray')}>
                        {mem.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-mc-muted leading-snug">{mem.content}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mem.tags.map((tag) => (
                        <span key={tag} className="tag tag-gray text-[9px]">#{tag}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResourceRow({ label, value, color }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-mc-muted w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-mc-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-mono w-10 text-right" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    running:  'tag-amber',
    complete: 'tag-green',
    failed:   'tag-red',
    pending:  'tag-gray',
  }
  return <span className={clsx('tag text-[10px]', map[status] || 'tag-gray')}>{status}</span>
}
