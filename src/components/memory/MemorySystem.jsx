import React, { useState, useMemo } from 'react'
import {
  Brain, Plus, Search, Trash2, Edit3, Save, X,
  Tag, Clock, Star, Bot, Globe,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const TYPE_CONFIG = {
  episodic: { label: 'Episodic', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', badge: 'tag-blue',   desc: 'Event memories' },
  semantic: { label: 'Semantic', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', badge: 'tag-purple', desc: 'Factual knowledge' },
  working:  { label: 'Working',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', badge: 'tag-amber',  desc: 'Active context' },
}

const IMPORTANCE_CONFIG = {
  high:   { label: 'High',   color: '#ef4444', icon: '🔴' },
  medium: { label: 'Medium', color: '#f59e0b', icon: '🟡' },
  low:    { label: 'Low',    color: '#22c55e', icon: '🟢' },
}

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MemorySystem() {
  const memories = useStore((s) => s.memories)
  const agents   = useStore((s) => s.agents)
  const addMemory    = useStore((s) => s.addMemory)
  const updateMemory = useStore((s) => s.updateMemory)
  const deleteMemory = useStore((s) => s.deleteMemory)

  const [selectedAgent, setSelectedAgent] = useState('all')
  const [selectedType, setSelectedType]   = useState('all')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]))

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      if (selectedAgent !== 'all') {
        if (selectedAgent === 'global' && m.agentId !== null) return false
        if (selectedAgent !== 'global' && m.agentId !== Number(selectedAgent)) return false
      }
      if (selectedType !== 'all' && m.type !== selectedType) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.includes(q))
        )
      }
      return true
    })
  }, [memories, selectedAgent, selectedType, query])

  const startEdit = (mem) => {
    setEditingId(mem.id)
    setEditContent(mem.content)
  }

  const saveEdit = (id) => {
    updateMemory(id, { content: editContent })
    setEditingId(null)
  }

  const memoryCounts = {
    total:    memories.length,
    episodic: memories.filter((m) => m.type === 'episodic').length,
    semantic: memories.filter((m) => m.type === 'semantic').length,
    working:  memories.filter((m) => m.type === 'working').length,
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left sidebar — agent picker */}
      <div className="w-52 shrink-0 border-r border-mc-border flex flex-col bg-mc-deep">
        <div className="px-3 py-3 border-b border-mc-border">
          <div className="flex items-center gap-2">
            <Brain size={13} className="text-amber-400" />
            <span className="text-[12px] font-semibold text-mc-text">Memory System</span>
          </div>
          <div className="text-[10px] text-mc-muted mt-0.5">{memoryCounts.total} entries stored</div>
        </div>

        {/* Memory type stats */}
        <div className="px-3 py-3 space-y-1.5 border-b border-mc-border">
          {Object.entries(TYPE_CONFIG).map(([key, tc]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: tc.color }} />
                <span className="text-[10px] text-mc-muted">{tc.label}</span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: tc.color }}>
                {memoryCounts[key]}
              </span>
            </div>
          ))}
        </div>

        {/* Filter by agent */}
        <div className="px-3 py-2 border-b border-mc-border">
          <div className="text-[10px] font-semibold text-mc-subtle uppercase tracking-wide mb-1.5">
            Filter by Agent
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1 px-2">
          {[
            { id: 'all',    name: 'All Agents',  icon: '🌐', color: '#f59e0b' },
            { id: 'global', name: 'System/Global', icon: '⚙️', color: '#64748b' },
            ...agents.map((a) => ({ id: String(a.id), name: a.name, icon: a.icon, color: a.color })),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedAgent(item.id)}
              className={clsx(
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-all mb-0.5',
                selectedAgent === item.id
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-mc-muted hover:text-mc-text hover:bg-mc-panel'
              )}
            >
              <span>{item.icon}</span>
              <span className="truncate">{item.name.split(' ')[0]}</span>
              <span className="ml-auto text-[9px] font-mono" style={{ color: item.color }}>
                {item.id === 'all'
                  ? memoryCounts.total
                  : item.id === 'global'
                  ? memories.filter((m) => m.agentId === null).length
                  : memories.filter((m) => m.agentId === Number(item.id)).length
                }
              </span>
            </button>
          ))}
        </div>

        {/* Add memory button */}
        <div className="px-3 py-3 border-t border-mc-border">
          <button className="btn-primary w-full justify-center text-[11px]" onClick={() => setShowCreate(true)}>
            <Plus size={12} />
            New Memory
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search + type filter */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-mc-border shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mc-muted" />
            <input
              className="mc-input pl-8 h-8 text-[12px]"
              placeholder="Search memories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-mc-panel border border-mc-border rounded-md p-0.5">
            {['all', 'episodic', 'semantic', 'working'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={clsx(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-all capitalize',
                  selectedType === t
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-mc-muted hover:text-mc-text'
                )}
              >
                {t === 'all' ? `All (${memoryCounts.total})` : `${t} (${memoryCounts[t]})`}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-mc-muted ml-auto">{filtered.length} results</span>
        </div>

        {/* Memory cards */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Brain size={40} className="text-mc-border mx-auto mb-3" />
                <div className="text-mc-muted text-sm">No memories found</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((mem) => {
                const tc = TYPE_CONFIG[mem.type] || TYPE_CONFIG.semantic
                const ic = IMPORTANCE_CONFIG[mem.importance] || IMPORTANCE_CONFIG.medium
                const agent = mem.agentId ? agentMap[mem.agentId] : null
                const isEditing = editingId === mem.id

                return (
                  <div
                    key={mem.id}
                    className="mc-panel overflow-hidden"
                    style={{ borderColor: `${tc.color}25` }}
                  >
                    {/* Memory header */}
                    <div className="px-4 py-3 flex items-start justify-between border-b border-mc-border/50"
                         style={{ background: `${tc.bg}` }}>
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="mt-0.5">
                          <span className={clsx('tag text-[10px]', tc.badge)}>{tc.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-mc-text truncate">{mem.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {agent ? (
                              <span className="text-[10px] text-mc-muted flex items-center gap-1">
                                <span>{agent.icon}</span>
                                <span>{agent.name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-mc-muted flex items-center gap-1">
                                <Globe size={10} />
                                <span>System</span>
                              </span>
                            )}
                            <span className="text-mc-subtle text-[10px]">·</span>
                            <span className="text-[10px] text-mc-subtle flex items-center gap-1">
                              <Clock size={9} />
                              {fmtDate(mem.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span title={`${ic.label} importance`}>{ic.icon}</span>
                        {!isEditing && (
                          <button className="btn-ghost" onClick={() => startEdit(mem)}>
                            <Edit3 size={11} />
                          </button>
                        )}
                        <button className="btn-ghost" onClick={() => deleteMemory(mem.id)}>
                          <Trash2 size={11} className="text-red-400/60" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            className="mc-input resize-none text-[12px] w-full"
                            rows={4}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button className="btn-primary text-[11px] py-1.5" onClick={() => saveEdit(mem.id)}>
                              <Save size={11} />
                              Save
                            </button>
                            <button className="btn-secondary text-[11px] py-1.5" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[12px] text-mc-muted leading-relaxed">{mem.content}</p>
                      )}
                    </div>

                    {/* Tags */}
                    {mem.tags.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {mem.tags.map((tag) => (
                          <span key={tag} className="tag tag-gray text-[10px]">
                            <Tag size={8} className="mr-0.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create memory modal */}
      {showCreate && (
        <CreateMemoryModal
          agents={agents}
          onClose={() => setShowCreate(false)}
          onCreate={(mem) => { addMemory(mem); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

// ── CreateMemoryModal ─────────────────────────────────────────────────────────
function CreateMemoryModal({ agents, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'semantic',
    importance: 'medium',
    agentId: 'global',
    tags: '',
  })

  const handleCreate = () => {
    if (!form.title.trim() || !form.content.trim()) return
    onCreate({
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      importance: form.importance,
      agentId: form.agentId === 'global' ? null : Number(form.agentId),
      tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div className="text-[14px] font-semibold text-mc-text">Store New Memory</div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Title *</label>
            <input className="mc-input" placeholder="Memory title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Content *</label>
            <textarea className="mc-input resize-none" rows={4} placeholder="Memory content..." value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Type</label>
              <select className="mc-select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="episodic">Episodic</option>
                <option value="semantic">Semantic</option>
                <option value="working">Working</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Importance</label>
              <select className="mc-select" value={form.importance} onChange={(e) => setForm((f) => ({ ...f, importance: e.target.value }))}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Assign to Agent</label>
            <select className="mc-select" value={form.agentId} onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}>
              <option value="global">⚙️ System / Global</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Tags (comma-separated)</label>
            <input className="mc-input" placeholder="research, finance, q4" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-mc-border">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.title.trim() || !form.content.trim()}
            style={{ opacity: (!form.title.trim() || !form.content.trim()) ? 0.5 : 1 }}
            onClick={handleCreate}
          >
            <Save size={13} />
            Store Memory
          </button>
        </div>
      </div>
    </div>
  )
}
