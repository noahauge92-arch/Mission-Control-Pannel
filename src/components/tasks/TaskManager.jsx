/*
 * ════════════════════════════════════════════════════════════════════════════
 * TASK MANAGER — Création & suivi des tâches
 * ════════════════════════════════════════════════════════════════════════════
 *
 * BABY BOSS — Chef de Projet
 *     ├── reçoit objectif en langage naturel
 *     ├── analyse les tâches créées par l'humain
 *     ├── dispatche vers le bon agent selon son rôle
 *     └── monitore via state files et logs réels
 *
 * Agents Système (non-supprimables)
 *     ├── Alfred    → alfred-polymarket.mjs  → trading Polymarket 24/7
 *     └── Balthazar → balthazar.mjs          → coding site web et app avec github
 *
 * Agents Custom (créés via modal +)
 *     └── définis par l'utilisateur, scripts dans ~/.openclaw/agents/
 *
 * Flux de travail
 *     Humain crée tâches → Baby Boss dispatche → Agents exécutent
 *     → Résultats dans state files → Dashboard affiche tout en temps réel
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Rocket, Trash2, CheckCircle, Circle, Clock,
  AlertCircle, Filter, Eye,
} from 'lucide-react'
import clsx from 'clsx'

const PRIORITIES = ['high', 'medium', 'low']
const CATEGORIES = ['research', 'code', 'trading', 'analysis', 'other']
const STATUSES   = ['todo', 'in-progress', 'done']

const ASSIGNABLE_AGENTS = [
  { id: 'patron',    name: 'Le Patron', icon: '👑' },
  { id: 'balthazar', name: 'Balthazar', icon: '💻' },
  { id: '2fois',     name: '2fois',     icon: '📱' },
]

const PRIORITY_CFG = {
  high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',  label: 'Haute' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)', label: 'Moyenne' },
  low:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',  label: 'Basse' },
}

const STATUS_CFG = {
  'todo':        { color: '#94a3b8', icon: Circle,       label: 'Todo' },
  'in-progress': { color: '#3b82f6', icon: Clock,        label: 'En cours' },
  'done':        { color: '#22c55e', icon: CheckCircle,  label: 'Done' },
  'error':       { color: '#ef4444', icon: AlertCircle,  label: 'Erreur' },
}

const CATEGORY_CFG = {
  research: { color: '#3b82f6', label: 'Recherche',  icon: '🔍' },
  code:     { color: '#22c55e', label: 'Code',       icon: '💻' },
  trading:  { color: '#f59e0b', label: 'Trading',    icon: '📊' },
  analysis: { color: '#a855f7', label: 'Analyse',    icon: '🧠' },
  other:    { color: '#64748b', label: 'Autre',      icon: '📌' },
}

// ── ResultModal ───────────────────────────────────────────────────────────────
function ResultModal({ task, onClose }) {
  const agentMeta = ASSIGNABLE_AGENTS.find((a) => a.id === task.assignedTo)
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0d111a', border: '1px solid #1a2236', width: 620, maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a2236' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#22c55e', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={12} color="#22c55e" />
              TÂCHE COMPLÉTÉE
              {agentMeta && <span style={{ color: '#94a3b8' }}>— {agentMeta.icon} {agentMeta.name}</span>}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{task.title}</div>
            {task.completedAt && (
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a6080', marginTop: 3 }}>
                Complété le {new Date(task.completedAt).toLocaleString('fr-FR')}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}><X size={15} /></button>
        </div>

        {/* Result */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {task.result ? (
            <pre style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8d8e8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7, margin: 0 }}>
              {task.result}
            </pre>
          ) : task.error ? (
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#ef4444' }}>
              ❌ Erreur: {task.error}
            </div>
          ) : (
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Aucun résultat disponible.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CreateTaskModal ──────────────────────────────────────────────────────────
function CreateTaskModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    assignedTo: '',
  })

  const handleCreate = () => {
    if (!form.title.trim()) return
    onCreate(form)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0d111a', border: '1px solid #1a2236', width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a2236' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            + Nouvelle Tâche
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={15} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label className="text-[10px] font-mono font-bold text-mc-muted uppercase tracking-wider block mb-1.5">Titre *</label>
            <input
              autoFocus
              placeholder="ex: Scraper les données Polymarket, Refactorer le module auth..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && form.title.trim() && handleCreate()}
              className="mc-input w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-mono font-bold text-mc-muted uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              rows={3}
              placeholder="Détails de la tâche..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mc-input w-full resize-none"
            />
          </div>

          {/* Priority + Category */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="text-[10px] font-mono font-bold text-mc-muted uppercase tracking-wider block mb-2">Priorité</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CFG[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      style={{
                        flex: 1, padding: '6px 0', fontFamily: 'monospace', fontSize: 10,
                        background: form.priority === p ? cfg.bg : 'transparent',
                        border: `1px solid ${form.priority === p ? cfg.border : '#2a3a50'}`,
                        color: form.priority === p ? cfg.color : '#64748b',
                        cursor: 'pointer', textTransform: 'uppercase',
                      }}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label className="text-[10px] font-mono font-bold text-mc-muted uppercase tracking-wider block mb-2">Catégorie</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => {
                  const cfg = CATEGORY_CFG[c]
                  return (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      style={{
                        padding: '4px 8px', fontFamily: 'monospace', fontSize: 9,
                        background: form.category === c ? `${cfg.color}18` : 'transparent',
                        border: `1px solid ${form.category === c ? `${cfg.color}50` : '#2a3a50'}`,
                        color: form.category === c ? cfg.color : '#64748b',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <span>{cfg.icon}</span> {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          {/* Assign to agent */}
          <div>
            <label className="text-[10px] font-mono font-bold text-mc-muted uppercase tracking-wider block mb-2">
              Assigner à un agent <span style={{ color: '#3b82f6' }}>(l&apos;orchestrateur exécutera automatiquement)</span>
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setForm((f) => ({ ...f, assignedTo: '' }))}
                style={{
                  padding: '5px 10px', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer',
                  background: !form.assignedTo ? 'rgba(148,163,184,0.15)' : 'transparent',
                  border: `1px solid ${!form.assignedTo ? '#94a3b8' : '#2a3a50'}`,
                  color: !form.assignedTo ? '#94a3b8' : '#64748b',
                }}
              >
                Non assigné
              </button>
              {ASSIGNABLE_AGENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setForm((f) => ({ ...f, assignedTo: a.id }))}
                  style={{
                    padding: '5px 10px', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer',
                    background: form.assignedTo === a.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                    border: `1px solid ${form.assignedTo === a.id ? 'rgba(59,130,246,0.5)' : '#2a3a50'}`,
                    color: form.assignedTo === a.id ? '#3b82f6' : '#64748b',
                  }}
                >
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!form.title.trim()}
            className="btn-primary"
            style={{ opacity: form.title.trim() ? 1 : 0.5 }}
          >
            <Plus size={13} /> Créer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Elapsed time display ─────────────────────────────────────────────────────
function useElapsed(startedAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const m = Math.floor(elapsed / 60), s = elapsed % 60
  return elapsed < 60 ? `${s}s` : `${m}m${s}s`
}

// ── TaskRow ──────────────────────────────────────────────────────────────────
function TaskRow({ task, onUpdate, onDelete, onViewResult }) {
  const sCfg = STATUS_CFG[task.status] || STATUS_CFG.todo
  const pCfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium
  const cCfg = CATEGORY_CFG[task.category] || CATEGORY_CFG.other
  const StatusIcon = sCfg.icon
  const agentMeta  = ASSIGNABLE_AGENTS.find((a) => a.id === task.assignedTo)
  const elapsed    = useElapsed(task.status === 'in-progress' ? task.startedAt : null)
  const inProgress = task.status === 'in-progress'

  const cycleStatus = () => {
    if (task.status === 'error') { onUpdate(task.id, { status: 'todo' }); return }
    const next = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo'
    onUpdate(task.id, { status: next })
  }

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-3 border-b border-mc-border/50 hover:bg-mc-panel/30 transition-colors group',
      task.status === 'done' && 'opacity-60',
    )}>
      {/* Status toggle / spinner */}
      <button
        onClick={cycleStatus}
        className="shrink-0"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: sCfg.color, padding: 0 }}
        title={`Status: ${sCfg.label} (click to cycle)`}
      >
        {inProgress ? (
          <div style={{
            width: 16, height: 16, border: `2px solid ${sCfg.color}30`,
            borderTop: `2px solid ${sCfg.color}`,
            borderRadius: '50%', animation: 'task-spin 0.8s linear infinite',
          }} />
        ) : (
          <StatusIcon size={16} />
        )}
      </button>

      {/* Priority dot */}
      <div
        style={{ width: 8, height: 8, borderRadius: '50%', background: pCfg.color, flexShrink: 0, boxShadow: `0 0 4px ${pCfg.color}40` }}
        title={`Priorité: ${pCfg.label}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div className={clsx('text-[12px] font-medium truncate', task.status === 'done' ? 'text-mc-muted line-through' : 'text-mc-text')}>
            {task.title}
          </div>
          {inProgress && task.startedAt && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#3b82f6', flexShrink: 0 }}>⏱ {elapsed}</span>
          )}
        </div>
        {task.description && (
          <div className="text-[10px] text-mc-muted mt-0.5 truncate">{task.description}</div>
        )}
        {task.status === 'error' && task.error && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#ef4444', marginTop: 2 }}>❌ {task.error}</div>
        )}
      </div>

      {/* Category badge */}
      <span
        className="shrink-0 text-[9px] font-mono px-2 py-0.5 border"
        style={{ background: `${cCfg.color}12`, borderColor: `${cCfg.color}30`, color: cCfg.color }}
      >
        {cCfg.icon} {cCfg.label}
      </span>

      {/* Assigned agent badge */}
      {(agentMeta || task.assignedToName) && (
        <span className="shrink-0 text-[9px] font-mono px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400">
          {agentMeta ? `${agentMeta.icon} ${agentMeta.name}` : `→ ${task.assignedToName}`}
        </span>
      )}

      {/* Status badge */}
      <span
        className="shrink-0 text-[9px] font-mono px-2 py-0.5 border"
        style={{ background: `${sCfg.color}12`, borderColor: `${sCfg.color}30`, color: sCfg.color }}
      >
        {sCfg.label}
      </span>

      {/* "Voir résultat" — visible only when done with result */}
      {(task.status === 'done' || task.status === 'error') && (task.result || task.error) && (
        <button
          onClick={() => onViewResult(task)}
          className="shrink-0"
          style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: task.status === 'error' ? '#ef4444' : '#22c55e',
            cursor: 'pointer', padding: '3px 8px',
            fontFamily: 'monospace', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4,
          }}
          title="Voir le résultat de l'agent"
        >
          <Eye size={10} /> Résultat
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TaskManager() {
  const [tasks, setTasks]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAgent, setFilterAgent]   = useState('all')
  const [dispatchResult, setDispatchResult] = useState(null)
  const [resultTask, setResultTask]   = useState(null)

  const fetchTasks = useCallback(async () => {
    try {
      const r = await fetch('/api/tasks')
      setTasks(await r.json())
      setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchTasks()
    // Auto-refresh every 8s so in-progress tasks update when orchestrator finishes
    const interval = setInterval(fetchTasks, 8_000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const handleCreate = async (form) => {
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const task = await r.json()
      setTasks((t) => [...t, task])
    } catch (e) { alert('Error: ' + e.message) }
  }

  const handleUpdate = async (id, updates) => {
    try {
      const r = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const updated = await r.json()
      setTasks((t) => t.map((tk) => tk.id === id ? updated : tk))
    } catch (e) { alert('Error: ' + e.message) }
  }

  const handleDelete = async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((t) => t.filter((tk) => tk.id !== id))
  }

  const handleDispatch = async () => {
    setDispatching(true)
    setDispatchResult(null)
    try {
      const r = await fetch('/api/boss/dispatch', { method: 'POST' })
      const result = await r.json()
      setDispatchResult(result)
      // Refresh tasks
      const tasksRes = await fetch('/api/tasks')
      setTasks(await tasksRes.json())
      setTimeout(() => setDispatchResult(null), 5000)
    } catch (e) { alert('Dispatch error: ' + e.message) }
    finally { setDispatching(false) }
  }

  // Stats
  const todoCount       = tasks.filter((t) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length
  const doneCount       = tasks.filter((t) => t.status === 'done').length

  // Unique assigned agents
  const assignedAgents = [...new Set(tasks.filter((t) => t.assignedToName).map((t) => t.assignedToName))]

  // Filter
  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterAgent !== 'all' && t.assignedToName !== filterAgent) return false
    return true
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-mc-border bg-gradient-to-r from-mc-deep to-mc-panel">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-blue-400 text-lg">📋</span>
              <span className="text-[20px] font-bold text-mc-text">Tâches</span>
            </div>
            <p className="text-[12px] text-mc-muted">Créez des tâches et laissez Baby Boss les dispatcher aux agents</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="tag tag-gray">{todoCount} Todo</span>
              <span className="tag" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>{inProgressCount} In Progress</span>
              <span className="tag tag-green">{doneCount} Done</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDispatch}
              disabled={dispatching || todoCount === 0}
              className={clsx('btn-secondary flex items-center gap-2', todoCount === 0 && 'opacity-50')}
            >
              <Rocket size={13} /> {dispatching ? 'Dispatching...' : 'Envoyer à Baby Boss'}
            </button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Dispatch result */}
        {dispatchResult && (
          <div className="mt-3 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono text-blue-300">
            🚀 Baby Boss a dispatché {dispatchResult.dispatched} tâche(s)
            {dispatchResult.assignments?.map((a, i) => (
              <span key={i} className="ml-2 text-blue-400">
                [{a.agentName} ← {a.taskTitle?.slice(0, 25)}]
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="shrink-0 px-6 py-2.5 border-b border-mc-border flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={11} className="text-mc-muted" />
          <span className="text-[10px] text-mc-muted font-mono">Statut:</span>
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                'px-2.5 py-1 rounded text-[10px] font-mono transition-all border',
                filterStatus === s ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'text-mc-muted border-transparent hover:text-mc-text',
              )}
            >
              {s === 'all' ? 'Tous' : STATUS_CFG[s]?.label || s}
            </button>
          ))}
        </div>

        {assignedAgents.length > 0 && (
          <div className="flex items-center gap-1.5 ml-4">
            <span className="text-[10px] text-mc-muted font-mono">Agent:</span>
            <button
              onClick={() => setFilterAgent('all')}
              className={clsx(
                'px-2.5 py-1 rounded text-[10px] font-mono border transition-all',
                filterAgent === 'all' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'text-mc-muted border-transparent hover:text-mc-text',
              )}
            >
              Tous
            </button>
            {assignedAgents.map((a) => (
              <button
                key={a}
                onClick={() => setFilterAgent(a)}
                className={clsx(
                  'px-2.5 py-1 rounded text-[10px] font-mono border transition-all',
                  filterAgent === a ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'text-mc-muted border-transparent hover:text-mc-text',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-mc-muted text-[12px] font-mono">Chargement...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
              <div className="text-[12px] text-red-300 font-mono">{error}</div>
              <div className="text-[11px] text-mc-muted mt-1">Vérifie que <code className="text-amber-300">npm run server</code> tourne</div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-mc-muted text-[13px]">
                {tasks.length === 0 ? 'Aucune tâche créée' : 'Aucune tâche ne correspond au filtre'}
              </div>
              {tasks.length === 0 && (
                <button onClick={() => setShowCreate(true)} className="btn-primary mt-3">
                  <Plus size={13} /> Créer la première tâche
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onViewResult={setResultTask}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {resultTask  && <ResultModal task={resultTask} onClose={() => setResultTask(null)} />}
      <style>{`@keyframes task-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
