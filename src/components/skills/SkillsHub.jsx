import React, { useState, useMemo, useRef } from 'react'
import { Zap, Plus, Search, Star, Trash2, CheckCircle, Package, X, Download, UploadCloud, FileArchive, AlertCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const CATEGORIES = ['All', 'Research', 'Development', 'Productivity', 'Marketing', 'Creative', 'Analytics']

const CAT_COLORS = {
  Research:    { bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6',  border: 'rgba(59,130,246,0.3)' },
  Development: { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e',  border: 'rgba(34,197,94,0.3)' },
  Productivity:{ bg: 'rgba(168,85,247,0.15)',  text: '#a855f7',  border: 'rgba(168,85,247,0.3)' },
  Marketing:   { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b',  border: 'rgba(245,158,11,0.3)' },
  Creative:    { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  border: 'rgba(239,68,68,0.3)' },
  Analytics:   { bg: 'rgba(6,182,212,0.15)',   text: '#06b6d4',  border: 'rgba(6,182,212,0.3)' },
}

// ── ZIP DnD install zone ──────────────────────────────────────────────────────
function ZipDropZone({ onInstalled }) {
  const [drag, setDrag]   = useState(false)  // drag-over highlight
  const [status, setStatus] = useState(null) // null | 'uploading' | { ok, name } | { error }
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setStatus({ error: 'Le fichier doit être un .zip' })
      return
    }

    setStatus('uploading')
    const body = new FormData()
    body.append('skill', file)

    try {
      const res = await fetch('/api/skills/install', { method: 'POST', body })
      const data = await res.json()

      if (!res.ok || data.error) {
        setStatus({ error: data.error || 'Erreur serveur' })
        return
      }

      setStatus({ ok: true, name: data.skillName, files: data.files })
      onInstalled(data)
      setTimeout(() => setStatus(null), 5000)
    } catch (e) {
      setStatus({ error: e.message })
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    handleFile(e.dataTransfer.files[0])
  }

  const isUploading = status === 'uploading'

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={clsx(
        'flex items-center gap-4 px-6 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-all select-none',
        drag    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]' : 'border-mc-border bg-mc-panel hover:border-mc-borderLight hover:bg-mc-panel/80',
        isUploading && 'pointer-events-none opacity-70',
      )}
    >
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

      {/* Icon */}
      <div className={clsx('w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-all',
        drag ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-mc-deep border border-mc-border')}>
        {isUploading
          ? <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          : <UploadCloud size={20} className={drag ? 'text-amber-400' : 'text-mc-muted'} />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {status === null && (
          <>
            <div className={clsx('text-[13px] font-semibold', drag ? 'text-amber-400' : 'text-mc-text')}>
              {drag ? 'Déposer ici pour installer' : 'Installer un skill personnalisé'}
            </div>
            <div className="text-[11px] text-mc-muted mt-0.5">
              Glisse un fichier <span className="font-mono text-amber-300">.zip</span> — extrait dans <span className="font-mono text-mc-muted">~/.openclaw/skills/</span>
            </div>
          </>
        )}
        {isUploading && (
          <div className="text-[12px] text-amber-300 font-mono">Installation en cours...</div>
        )}
        {status?.ok && (
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400 shrink-0" />
            <div>
              <div className="text-[12px] text-green-300 font-semibold">Installé : {status.name}</div>
              <div className="text-[11px] text-mc-muted">{status.files} fichiers extraits</div>
            </div>
          </div>
        )}
        {status?.error && (
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <div className="text-[12px] text-red-300">{status.error}</div>
          </div>
        )}
      </div>

      {/* Right badge */}
      <div className={clsx('shrink-0 px-2 py-1 rounded border text-[10px] font-mono', drag ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-mc-deep border-mc-border text-mc-subtle')}>
        <FileArchive size={11} className="inline mr-1" />.zip
      </div>

      {/* Dismiss error */}
      {status?.error && (
        <button className="btn-ghost shrink-0" onClick={(e) => { e.stopPropagation(); setStatus(null) }}>
          <X size={13} />
        </button>
      )}
    </div>
  )
}

// ── SkillCard ─────────────────────────────────────────────────────────────────
function SkillCard({ skill, onToggle, onDetail }) {
  const cat = CAT_COLORS[skill.category] || CAT_COLORS.Research
  return (
    <div className={clsx('mc-panel mc-hover flex flex-col cursor-pointer overflow-hidden', skill.installed && 'border-green-500/20')} onClick={onDetail}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl border shrink-0" style={{ background: cat.bg, borderColor: cat.border }}>
              {skill.icon}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-mc-text leading-tight">{skill.name}</div>
              <span className="tag text-[9px] mt-0.5 inline-block" style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>{skill.category}</span>
            </div>
          </div>
          {skill.installed && <CheckCircle size={14} className="text-green-400 shrink-0" />}
        </div>
        <p className="text-[11px] text-mc-muted leading-snug line-clamp-2">{skill.description}</p>
      </div>
      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Star size={10} className="text-amber-400" fill="currentColor" />
          <span className="text-[10px] font-mono text-amber-300">{skill.rating}</span>
        </div>
        <span className="text-[10px] font-mono text-mc-subtle">{skill.version}</span>
        <span className="text-[10px] text-mc-subtle">{skill.source}</span>
      </div>
      <div className="px-4 pb-4 mt-auto" onClick={(e) => e.stopPropagation()}>
        {skill.installed
          ? <button onClick={onToggle} className="w-full btn-danger justify-center py-2 text-[12px]"><Trash2 size={12} /> Remove</button>
          : <button onClick={onToggle} className="w-full btn-secondary justify-center py-2 text-[12px]"><CheckCircle size={12} /> Mark Installed</button>
        }
      </div>
    </div>
  )
}

// ── SkillDetailModal ──────────────────────────────────────────────────────────
function SkillDetailModal({ skill, onClose, onToggle }) {
  const cat = CAT_COLORS[skill.category] || CAT_COLORS.Research
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border" style={{ background: cat.bg, borderColor: cat.border }}>{skill.icon}</div>
            <div>
              <div className="text-[15px] font-semibold text-mc-text">{skill.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="tag text-[9px]" style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>{skill.category}</span>
                <span className="text-[10px] font-mono text-mc-muted">{skill.version}</span>
                <span className="text-[10px] text-mc-muted">by {skill.source}</span>
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[12px] text-mc-muted">{skill.description}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" fill="currentColor" />
              <span className="text-[13px] font-bold text-amber-300">{skill.rating}</span>
              <span className="text-[10px] text-mc-muted">/5.0</span>
            </div>
            {skill.installed && <span className="tag tag-green">✓ Installed</span>}
          </div>
          {skill.params && Object.keys(skill.params).length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide mb-2">Parameters</div>
              <div className="bg-mc-panel border border-mc-border rounded-lg p-3 space-y-1.5">
                {Object.entries(skill.params).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-blue-400 w-36 shrink-0">{k}</span>
                    <span className="text-[11px] font-mono text-mc-muted">{Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-mc-border flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className={skill.installed ? 'btn-danger text-[13px] px-4 py-2' : 'btn-primary'} onClick={onToggle}>
            {skill.installed ? <><Trash2 size={13} /> Remove</> : <><CheckCircle size={13} /> Mark Installed</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CreateSkillModal ──────────────────────────────────────────────────────────
function CreateSkillModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', category: 'Development', description: '', icon: '🔧' })
  const ICONS = ['🔧','⚙️','🛠️','🔌','🧩','🎯','🚀','💡','🔐','📡']
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div className="text-[14px] font-semibold text-mc-text">Create Custom Skill</div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Name *</label>
            <input className="mc-input" placeholder="e.g. Slack Notifier" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button key={icon} onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`w-9 h-9 rounded-lg text-lg transition-all border ${form.icon === icon ? 'bg-amber-500/20 border-amber-500/40' : 'bg-mc-panel border-mc-border hover:border-mc-borderLight'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Category</label>
            <select className="mc-select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">Description *</label>
            <textarea className="mc-input resize-none" rows={2} placeholder="What does this skill do?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-mc-border">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!form.name.trim() || !form.description.trim()} style={{ opacity: (!form.name.trim() || !form.description.trim()) ? 0.5 : 1 }} onClick={() => onCreate(form)}>
            <Plus size={13} /> Create Skill
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SkillsHub() {
  const skills         = useStore((s) => s.skills)
  const toggleSkill    = useStore((s) => s.toggleSkill)
  const addCustomSkill = useStore((s) => s.addCustomSkill)

  const [query,      setQuery]      = useState('')
  const [category,   setCategory]   = useState('All')
  const [filter,     setFilter]     = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [detailSkill,setDetailSkill]= useState(null)
  const [zipToast,   setZipToast]   = useState(null)

  const installedCount = skills.filter((s) => s.installed).length
  const availableCount = skills.length - installedCount

  const filtered = useMemo(() => skills.filter((s) => {
    if (filter === 'Installed' && !s.installed) return false
    if (category !== 'All' && s.category !== category) return false
    if (query) { const q = query.toLowerCase(); return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) }
    return true
  }), [skills, filter, category, query])

  const handleZipInstalled = (data) => {
    // Add the newly installed ZIP skill to store
    addCustomSkill({
      name: data.skillName,
      category: 'Development',
      description: `Installed from ${data.skillName}.zip — ${data.files} files`,
      icon: '📦',
    })
    setZipToast(data.skillName)
    setTimeout(() => setZipToast(null), 4000)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Hero header */}
      <div className="shrink-0 px-6 py-5 border-b border-mc-border bg-gradient-to-r from-mc-deep to-mc-panel">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-amber-400 text-lg">⚡</span>
              <span className="text-[20px] font-bold text-mc-text">ClaWHub</span>
            </div>
            <p className="text-[12px] text-mc-muted">Skills marketplace — extend your ClawBot's capabilities</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="tag tag-green">{installedCount} Installed</span>
              <span className="tag tag-gray">{availableCount} Available</span>
              {zipToast && <span className="tag tag-amber text-[10px]">📦 {zipToast} installé !</span>}
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Create Custom Skill
          </button>
        </div>

        {/* ZIP Drop zone */}
        <div className="mt-4">
          <ZipDropZone onInstalled={handleZipInstalled} />
        </div>
      </div>

      {/* Search + filters */}
      <div className="shrink-0 px-6 py-3 border-b border-mc-border flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mc-muted" />
          <input className="mc-input pl-8 h-8 text-[12px]" placeholder="Search skills..." value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-mc-muted hover:text-mc-text" onClick={() => setQuery('')}><X size={12} /></button>}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={clsx('px-3 py-1.5 rounded-md text-[11px] font-medium transition-all border', category === cat ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'text-mc-muted border-transparent hover:text-mc-text hover:bg-mc-panel')}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-mc-panel border border-mc-border rounded-md p-0.5 shrink-0">
          {['All', 'Installed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={clsx('px-2.5 py-1 rounded text-[11px] font-medium transition-all', filter === f ? 'bg-amber-500/20 text-amber-400' : 'text-mc-muted hover:text-mc-text')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0
          ? <div className="flex items-center justify-center h-full"><div className="text-center"><Package size={40} className="text-mc-border mx-auto mb-3" /><div className="text-mc-muted text-sm">No skills match your search</div></div></div>
          : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((skill) => (
                <SkillCard key={skill.id} skill={skill} onToggle={() => toggleSkill(skill.id)} onDetail={() => setDetailSkill(skill)} />
              ))}
            </div>
          )}
      </div>

      {showCreate  && <CreateSkillModal onClose={() => setShowCreate(false)} onCreate={(s) => { addCustomSkill(s); setShowCreate(false) }} />}
      {detailSkill && <SkillDetailModal skill={detailSkill} onClose={() => setDetailSkill(null)} onToggle={() => { toggleSkill(detailSkill.id); setDetailSkill(null) }} />}
    </div>
  )
}
