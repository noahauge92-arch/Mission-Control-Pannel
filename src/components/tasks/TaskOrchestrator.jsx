import React, { useState } from 'react'
import {
  Plus, ListTodo, Activity, CheckCircle2, XCircle, Clock,
  RefreshCw, Trash2, ChevronDown, ChevronUp, X, Bot,
  AlertTriangle, Play, Flag,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const COLUMNS = [
  { id: 'pending',  label: 'Pending',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  { id: 'running',  label: 'Running',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'complete', label: 'Complete',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { id: 'failed',   label: 'Failed',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
]

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#ef4444', icon: '🔴' },
  medium: { label: 'Medium', color: '#f59e0b', icon: '🟡' },
  low:    { label: 'Low',    color: '#22c55e', icon: '🟢' },
}

export default function TaskOrchestrator() {
  const tasks        = useStore((s) => s.tasks)
  const agents       = useStore((s) => s.agents)
  const updateTask   = useStore((s) => s.updateTask)
  const removeTask   = useStore((s) => s.removeTask)
  const retryTask    = useStore((s) => s.retryTask)
  const addTask      = useStore((s) => s.addTask)

  const [showCreate, setShowCreate] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)
  const [detailTask, setDetailTask] = useState(null)

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]))

  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ListTodo size={16} className="text-amber-400" />
            <span className="text-[14px] font-semibold text-mc-text">Task Orchestrator</span>
          </div>
          <div className="flex items-center gap-2">
            {COLUMNS.map((col) => {
              const count = getTasksByStatus(col.id).length
              return (
                <span
                  key={col.id}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{ background: col.bg, color: col.color, borderColor: `${col.color}40` }}
                >
                  {col.label}: {count}
                </span>
              )
            })}
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={13} />
          New Mission
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full grid grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const colTasks = getTasksByStatus(col.id)
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-lg border overflow-hidden"
                style={{ borderColor: `${col.color}25`, background: col.bg }}
              >
                {/* Column header */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 border-b"
                  style={{ borderColor: `${col.color}25` }}
                >
                  <div className="flex items-center gap-2">
                    <ColIcon status={col.id} />
                    <span className="text-[12px] font-semibold" style={{ color: col.color }}>
                      {col.label}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-bold font-mono w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: `${col.color}25`, color: col.color }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agent={agentMap[task.assignedAgentId]}
                      expanded={expandedTask === task.id}
                      onExpand={() => setExpandedTask(
                        expandedTask === task.id ? null : task.id
                      )}
                      onDetail={() => setDetailTask(task)}
                      onRetry={() => retryTask(task.id)}
                      onRemove={() => removeTask(task.id)}
                      onStart={() => updateTask(task.id, { status: 'running' })}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-16">
                      <span className="text-[11px]" style={{ color: `${col.color}60` }}>
                        No {col.label.toLowerCase()} tasks
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateTaskModal
          agents={agents}
          onClose={() => setShowCreate(false)}
          onCreate={(task) => { addTask(task); setShowCreate(false) }}
        />
      )}

      {/* Detail modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          agent={agentMap[detailTask.assignedAgentId]}
          onClose={() => setDetailTask(null)}
          onRetry={() => { retryTask(detailTask.id); setDetailTask(null) }}
        />
      )}
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
function TaskCard({ task, agent, expanded, onExpand, onDetail, onRetry, onRemove, onStart }) {
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  return (
    <div
      className={clsx(
        'bg-mc-card border rounded-lg overflow-hidden transition-all cursor-pointer',
        task.status === 'failed'  && 'border-red-500/25',
        task.status === 'running' && 'border-amber-500/25',
        task.status === 'complete'&& 'border-green-500/25',
        task.status === 'pending' && 'border-mc-border',
      )}
      onClick={onDetail}
    >
      <div className="p-3">
        {/* Title + priority */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <span className="text-[11px] shrink-0">{pc.icon}</span>
          <span className="text-[12px] font-semibold text-mc-text leading-tight flex-1">
            {task.name}
          </span>
        </div>

        {/* Agent */}
        {agent && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px]">{agent.icon}</span>
            <span className="text-[10px] text-mc-muted">{agent.name}</span>
          </div>
        )}

        {/* Progress bar for running tasks */}
        {task.status === 'running' && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-mc-muted">Progress</span>
              <span className="text-[9px] font-mono text-amber-400">{task.progress}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${task.progress}%`, background: '#f59e0b' }}
              />
            </div>
          </div>
        )}

        {/* Steps preview */}
        {expanded && (
          <div className="space-y-1 mt-2 pt-2 border-t border-mc-border/50">
            {task.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <StepIcon status={step.status} />
                <span className={clsx('text-[10px]', {
                  complete: 'text-green-400',
                  running:  'text-amber-400',
                  pending:  'text-mc-subtle',
                  failed:   'text-red-400',
                }[step.status] || 'text-mc-subtle')}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="px-3 py-2 border-t border-mc-border/50 flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn-ghost text-[10px] py-0.5" onClick={onExpand}>
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? 'Less' : 'Steps'}
        </button>

        {task.status === 'failed' && (
          <button className="btn-success text-[10px] py-1" onClick={onRetry}>
            <RefreshCw size={10} />
            Retry
          </button>
        )}

        {task.status === 'pending' && (
          <button className="btn-success text-[10px] py-1" onClick={onStart}>
            <Play size={10} />
            Start
          </button>
        )}

        <button className="btn-ghost ml-auto text-[10px] py-0.5" onClick={onRemove}>
          <Trash2 size={10} className="text-red-400/50" />
        </button>
      </div>
    </div>
  )
}

// ── TaskDetailModal ───────────────────────────────────────────────────────────
function TaskDetailModal({ task, agent, onClose, onRetry }) {
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span>{pc.icon}</span>
              <span className="text-[15px] font-semibold text-mc-text">{task.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={task.status} />
              <span className="text-[10px] text-mc-muted capitalize">{task.priority} priority</span>
              {agent && <span className="text-[10px] text-mc-muted">· {agent.name}</span>}
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
          <p className="text-[12px] text-mc-muted">{task.description}</p>

          {task.status === 'running' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-mc-muted">Overall Progress</span>
                <span className="text-[11px] font-mono text-amber-400">{task.progress}%</span>
              </div>
              <div className="h-2 bg-mc-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          <div>
            <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide mb-2">
              Execution Steps
            </div>
            <div className="space-y-2">
              {task.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-mc-panel border border-mc-border rounded-lg">
                  <StepIcon status={step.status} size={14} />
                  <span className={clsx('text-[12px] flex-1', {
                    complete: 'text-green-400',
                    running:  'text-amber-400',
                    pending:  'text-mc-muted',
                    failed:   'text-red-400',
                  }[step.status] || 'text-mc-muted')}>
                    {step.name}
                  </span>
                  <span className={clsx('tag text-[9px]', {
                    complete: 'tag-green',
                    running:  'tag-amber',
                    pending:  'tag-gray',
                    failed:   'tag-red',
                  }[step.status] || 'tag-gray')}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution log */}
          {task.logs.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide mb-2">
                Execution Log
              </div>
              <div className="bg-mc-bg border border-mc-border rounded-lg p-3 space-y-1.5 max-h-32 overflow-y-auto font-mono">
                {task.logs.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-mc-subtle shrink-0 mt-0.5">
                      {new Date(entry.time).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-mc-muted">{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-mc-border">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {task.status === 'failed' && (
            <button className="btn-primary" onClick={onRetry}>
              <RefreshCw size={13} />
              Retry Mission
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CreateTaskModal ───────────────────────────────────────────────────────────
function CreateTaskModal({ agents, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'medium',
    assignedAgentId: agents[0]?.id || null,
    steps: [{ name: '', status: 'pending' }],
  })

  const addStep = () =>
    setForm((f) => ({ ...f, steps: [...f.steps, { name: '', status: 'pending' }] }))

  const updateStep = (i, val) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, idx) => (idx === i ? { ...s, name: val } : s)),
    }))

  const removeStep = (i) =>
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))

  const handleCreate = () => {
    if (!form.name.trim()) return
    onCreate({
      ...form,
      assignedAgentId: Number(form.assignedAgentId),
      steps: form.steps.filter((s) => s.name.trim()),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div className="text-[14px] font-semibold text-mc-text">Create New Mission</div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Mission Name *</label>
            <input className="mc-input" placeholder="e.g. SEO Content Audit" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Description</label>
            <textarea className="mc-input resize-none" rows={2} placeholder="Describe the mission objective..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Priority</label>
              <select className="mc-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Assign Agent</label>
              <select className="mc-select" value={form.assignedAgentId} onChange={(e) => setForm((f) => ({ ...f, assignedAgentId: e.target.value }))}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide">Execution Steps</label>
              <button className="btn-ghost text-[11px]" onClick={addStep}><Plus size={11} /> Add Step</button>
            </div>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-mc-subtle w-5 shrink-0">{i + 1}.</span>
                  <input
                    className="mc-input flex-1"
                    placeholder={`Step ${i + 1} description`}
                    value={step.name}
                    onChange={(e) => updateStep(i, e.target.value)}
                  />
                  {form.steps.length > 1 && (
                    <button className="btn-ghost" onClick={() => removeStep(i)}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-mc-border">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.name.trim()}
            style={{ opacity: !form.name.trim() ? 0.5 : 1 }}
            onClick={handleCreate}
          >
            <Plus size={13} />
            Create Mission
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ColIcon({ status }) {
  const map = {
    pending:  <Clock    size={12} className="text-mc-muted" />,
    running:  <Activity size={12} className="text-amber-400 animate-pulse" />,
    complete: <CheckCircle2 size={12} className="text-green-400" />,
    failed:   <XCircle  size={12} className="text-red-400" />,
  }
  return map[status] || map.pending
}

function StepIcon({ status, size = 11 }) {
  const map = {
    complete: <CheckCircle2 size={size} className="text-green-400 shrink-0" />,
    running:  <Activity     size={size} className="text-amber-400 shrink-0 animate-pulse" />,
    pending:  <Clock        size={size} className="text-mc-subtle shrink-0" />,
    failed:   <XCircle      size={size} className="text-red-400 shrink-0" />,
  }
  return map[status] || map.pending
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
