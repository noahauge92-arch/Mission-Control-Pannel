import React, { useState, useEffect, useCallback } from 'react'
import { Plus, X, Trash2, Play, Square, Edit2, RefreshCw, AlertCircle } from 'lucide-react'

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  running: { color: '#22c55e', label: 'Running', pulse: true  },
  idle:    { color: '#94a3b8', label: 'Idle',    pulse: false },
  stopped: { color: '#ef4444', label: 'Stopped', pulse: false },
  error:   { color: '#f59e0b', label: 'Error',   pulse: true  },
}

const CHAIR_PALETTE = [
  '#ef4444','#22c55e','#3b82f6','#f59e0b',
  '#a855f7','#06b6d4','#ec4899','#f97316',
]

// ── PixelDesk ─────────────────────────────────────────────────────────────────
function PixelDesk({ agent, selected, onClick }) {
  const s = STATUS_CFG[agent.status] || STATUS_CFG.idle
  const chair = agent.chairColor || '#ef4444'

  return (
    <div
      onClick={onClick}
      title={`${agent.name} — ${s.label}`}
      style={{ position: 'relative', width: 148, cursor: 'pointer', userSelect: 'none',
        filter: selected ? 'drop-shadow(0 0 10px #f59e0b)' : undefined, transition: 'filter 0.15s' }}
    >
      {/* Status LED */}
      <div style={{
        position: 'absolute', top: 4, right: 4, zIndex: 10,
        width: 9, height: 9, background: s.color,
        border: '1.5px solid rgba(0,0,0,0.5)', boxShadow: `0 0 6px ${s.color}`,
      }} />

      {/* Desk surface */}
      <div style={{
        background: '#c49a6c', border: '2px solid #8b6030',
        boxShadow: '0 4px 0 #6b4020, 3px 0 0 #a07848, inset 0 1px 0 rgba(255,255,255,0.25)',
        padding: '10px 10px 8px', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }} />

        {/* Monitor */}
        <div style={{ background: '#1a1a2e', border: '2px solid #2a2a4a', width: 70, height: 50, margin: '0 auto 6px', position: 'relative', overflow: 'hidden' }}>
          {/* Screen content */}
          {agent.status === 'running' && (
            <svg viewBox="0 0 70 50" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <rect width="70" height="50" fill="#041a0e" />
              <polyline points="2,42 12,32 22,38 32,20 42,26 52,12 62,16 70,8" fill="none" stroke="#22c55e" strokeWidth="1.5" />
              <polyline points="2,42 12,32 22,38 32,20 42,26 52,12 62,16 70,8 70,50 2,50" fill="rgba(34,197,94,0.08)" />
              <text x="4" y="10" fill="#22c55e" fontSize="6" fontFamily="monospace" opacity="0.7">LIVE</text>
            </svg>
          )}
          {agent.status === 'idle' && (
            <svg viewBox="0 0 70 50" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <rect width="70" height="50" fill="#0a0a12" />
              <text x="8" y="28" fill="#3a4a6a" fontSize="7" fontFamily="monospace">STANDBY</text>
              <rect x="4" y="34" width="20" height="1" fill="#1a2a4a" />
              <rect x="4" y="38" width="28" height="1" fill="#1a2a4a" />
            </svg>
          )}
          {agent.status === 'stopped' && (
            <svg viewBox="0 0 70 50" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <rect width="70" height="50" fill="#0d0808" />
              <text x="22" y="30" fill="#3a1a1a" fontSize="9" fontFamily="monospace">OFF</text>
            </svg>
          )}
          {agent.status === 'error' && (
            <svg viewBox="0 0 70 50" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <rect width="70" height="50" fill="#0d0a00" />
              <text x="10" y="16" fill="#f59e0b" fontSize="6" fontFamily="monospace">WARNING</text>
              <text x="28" y="38" fill="#f59e0b" fontSize="18" fontFamily="monospace">!</text>
            </svg>
          )}
          {/* Stand */}
          <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 10, height: 4, background: '#2a2a3a' }} />
        </div>

        {/* Keyboard */}
        <div style={{ background: '#3a3a4a', border: '1px solid #222', height: 13, position: 'relative' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', top: 2 + i * 4, left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          ))}
          {/* Mouse */}
          <div style={{ position: 'absolute', right: -14, top: -3, width: 10, height: 14, background: '#3a3a4a', border: '1px solid #222', borderRadius: '2px 2px 4px 4px' }}>
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)', marginTop: 5 }} />
          </div>
        </div>
      </div>

      {/* Desk front */}
      <div style={{ background: '#a07848', height: 6, border: '2px solid #8b6030', borderTop: 'none', boxShadow: '0 2px 0 #6b4020' }} />

      {/* Legs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 14px' }}>
        {[0, 1].map((i) => <div key={i} style={{ width: 8, height: 12, background: '#7a5030', border: '1px solid #5a3820' }} />)}
      </div>

      {/* Chair */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4 }}>
        <div style={{ width: 36, height: 10, background: chair, border: `2px solid rgba(0,0,0,0.3)`, borderBottom: 'none', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2)' }} />
        <div style={{ width: 46, height: 34, background: chair, border: `2px solid rgba(0,0,0,0.3)`, boxShadow: `inset 0 2px 0 rgba(255,255,255,0.15), 0 3px 0 rgba(0,0,0,0.3)`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 8, left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div style={{ width: 54, height: 5, background: '#7a7a8a', border: '1px solid #555', boxShadow: '0 2px 0 #444' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', width: 52, marginTop: 2 }}>
          {[0,1,2,3,4].map((i) => <div key={i} style={{ width: 7, height: 7, background: '#555', border: '1px solid #333', borderRadius: '50%' }} />)}
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#c8d8e8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>{agent.name}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: s.color, marginTop: 2 }}>● {s.label}</div>
      </div>

      {/* Selection ring */}
      {selected && <div style={{ position: 'absolute', inset: -3, border: '2px solid #f59e0b', pointerEvents: 'none', boxShadow: '0 0 12px rgba(245,158,11,0.35)' }} />}
    </div>
  )
}

// ── EmptySlot ─────────────────────────────────────────────────────────────────
function EmptySlot({ onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: 148, height: 218, border: `2px dashed ${hover ? '#f59e0b' : '#2a3a50'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: hover ? 'rgba(245,158,11,0.04)' : 'transparent', transition: 'all 0.15s', gap: 10 }}
    >
      <div style={{ width: 36, height: 36, border: `2px dashed ${hover ? '#f59e0b' : '#2a3a50'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hover ? '#f59e0b' : '#2a3a50', transition: 'all 0.15s' }}>
        <Plus size={18} />
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: hover ? '#f59e0b' : '#2a3a50', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Agent</div>
    </div>
  )
}

// ── AgentPanel ────────────────────────────────────────────────────────────────
function AgentPanel({ agent, onClose, onUpdate, onDelete }) {
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: agent.name, description: agent.description, chairColor: agent.chairColor })
  const s = STATUS_CFG[agent.status] || STATUS_CFG.idle

  useEffect(() => {
    setForm({ name: agent.name, description: agent.description, chairColor: agent.chairColor })
    setEditing(false)
  }, [agent.id])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try { const r = await fetch(`/api/agents/${agent.id}/logs`); setLogs((await r.json()).lines || []) }
    catch { setLogs([]) }
    finally { setLogsLoading(false) }
  }, [agent.id])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const toggleStatus = () => onUpdate(agent.id, { status: agent.status === 'running' ? 'stopped' : 'running' })
  const save = async () => { await onUpdate(agent.id, form); setEditing(false) }

  const S = (p) => ({ fontFamily: 'monospace', ...p })  // shorthand

  return (
    <div style={{ width: 300, height: '100%', background: '#0d111a', borderLeft: '1px solid #1a2236', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid #1a2236' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 9, height: 9, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            <span style={S({ fontSize: 13, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' })}>{agent.name}</span>
          </div>
          <div style={S({ fontSize: 11, color: s.color, marginTop: 2 })}>{s.label}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {!editing ? (
          <>
            <Section label="Function">
              <div style={S({ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 })}>
                {agent.description || <span style={{ color: '#2a3a50', fontStyle: 'italic' }}>No description</span>}
              </div>
            </Section>

            <Section label="Chair">
              <div style={{ width: 22, height: 22, background: agent.chairColor || '#ef4444', border: '2px solid rgba(255,255,255,0.12)' }} />
            </Section>

            <Section label="Created">
              <div style={S({ fontSize: 11, color: '#475569' })}>
                {agent.createdAt ? new Date(agent.createdAt).toLocaleString('fr-FR') : '—'}
              </div>
            </Section>

            <Section label="Logs" extra={
              <button onClick={fetchLogs} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>
                <RefreshCw size={11} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            }>
              <div style={{ background: '#060810', border: '1px solid #1a2236', height: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10 }}>
                {logsLoading
                  ? <div style={{ padding: 10, color: '#64748b' }}>Loading...</div>
                  : logs.length === 0
                  ? <div style={{ padding: 10, color: '#2a3a50' }}>No logs found.</div>
                  : logs.map((line, i) => (
                    <div key={i} style={{ padding: '2px 8px', color: /error/i.test(line) ? '#ef4444' : /warn/i.test(line) ? '#f59e0b' : '#64748b', borderBottom: '1px solid #0d111e', lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))
                }
              </div>
            </Section>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={S({ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 })}>Name *</label>
              <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={S({ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box' })} />
            </div>
            <div>
              <label style={S({ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 })}>Function</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={S({ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box', resize: 'none' })} />
            </div>
            <div>
              <label style={S({ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 })}>Chair Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CHAIR_PALETTE.map((c) => (
                  <div key={c} onClick={() => setForm((f) => ({ ...f, chairColor: c }))}
                    style={{ width: 26, height: 26, background: c, cursor: 'pointer', border: form.chairColor === c ? '3px solid #f59e0b' : '2px solid transparent', boxShadow: form.chairColor === c ? '0 0 6px #f59e0b' : 'none', transition: 'all 0.1s' }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2236', display: 'flex', gap: 8 }}>
        {!editing ? (
          <>
            <Btn onClick={toggleStatus} color={agent.status === 'running' ? '#ef4444' : '#22c55e'} style={{ flex: 1 }}>
              {agent.status === 'running' ? <><Square size={11} /> Stop</> : <><Play size={11} /> Start</>}
            </Btn>
            <Btn onClick={() => setEditing(true)} color="#f59e0b"><Edit2 size={11} /> Edit</Btn>
            <Btn onClick={() => onDelete(agent.id)} color="#ef4444" dim><Trash2 size={11} /></Btn>
          </>
        ) : (
          <>
            <Btn onClick={save} color="#22c55e" style={{ flex: 1 }} disabled={!form.name.trim()}>Save</Btn>
            <Btn onClick={() => setEditing(false)} color="#64748b">Cancel</Btn>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ label, children, extra }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {label}{extra}
      </div>
      {children}
    </div>
  )
}

function Btn({ onClick, color, children, style, disabled, dim }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: `rgba(${hexToRgb(color)},${dim ? '0.07' : '0.1'})`, border: `1px solid rgba(${hexToRgb(color)},${dim ? '0.2' : '0.3'})`, color, cursor: disabled ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5, opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ── CreateModal ───────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', chairColor: '#ef4444' })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#0d111a', border: '1px solid #1a2236', width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a2236' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Agent</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={15} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nom *</label>
            <input autoFocus placeholder="ex: Scraper Bot, Analyser..." value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && form.name.trim() && onCreate(form)}
              style={{ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Fonction</label>
            <textarea rows={2} placeholder="Ce que fait cet agent..." value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', boxSizing: 'border-box', resize: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Couleur de Chaise</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CHAIR_PALETTE.map((c) => (
                <div key={c} onClick={() => setForm((f) => ({ ...f, chairColor: c }))}
                  style={{ width: 30, height: 30, background: c, cursor: 'pointer', border: form.chairColor === c ? '3px solid #f59e0b' : '2px solid transparent', boxShadow: form.chairColor === c ? '0 0 8px #f59e0b' : 'none', transition: 'all 0.1s' }} />
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div style={{ borderTop: '1px solid #1a2236', paddingTop: 16, display: 'flex', justifyContent: 'center' }}>
            <PixelDesk agent={{ ...form, status: 'idle', id: 'preview' }} selected={false} onClick={() => {}} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a3a50', color: '#64748b', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, padding: '8px 16px' }}>Cancel</button>
          <button onClick={() => form.name.trim() && onCreate(form)} disabled={!form.name.trim()}
            style={{ background: form.name.trim() ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.4)', color: form.name.trim() ? '#f59e0b' : '#64748b', cursor: form.name.trim() ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 12, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Créer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Workspace() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState(null)

  const fetchAgents = useCallback(async () => {
    try { const r = await fetch('/api/agents'); setAgents(await r.json()); setError(null) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  const handleCreate = async (form) => {
    try {
      const r = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const agent = await r.json()
      setAgents((a) => [...a, agent])
      setSelectedId(agent.id)
      setShowCreate(false)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const handleUpdate = async (id, updates) => {
    try {
      const r = await fetch(`/api/agents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      const updated = await r.json()
      setAgents((a) => a.map((ag) => ag.id === id ? updated : ag))
    } catch (e) { alert('Error: ' + e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet agent ?')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    setAgents((a) => a.filter((ag) => ag.id !== id))
    setSelectedId(null)
  }

  const selected = agents.find((a) => a.id === selectedId)

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', background: '#080b12' }}>
      {/* ── Room ── */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* Top wall */}
        <div style={{
          background: 'linear-gradient(180deg, #c4896b 0%, #b87850 100%)',
          borderBottom: '4px solid #7a4828',
          padding: '12px 28px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          {/* 3-pane window */}
          <div style={{ display: 'flex', gap: 3, background: '#5a7a8a', padding: 4, border: '3px solid #4a6070', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1)' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 66, height: 52, background: 'linear-gradient(135deg, #d8f0ff 0%, #a8d8f0 45%, #7ab8dc 100%)', border: '2px solid #4a6070', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 4, left: 4, width: 16, height: 28, background: 'rgba(255,255,255,0.45)', transform: 'skewX(-8deg)' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#4a6070' }} />
              </div>
            ))}
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(0,0,0,0.32)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Agent Workspace
          </div>

          {/* Shelf with colored folders */}
          <div style={{ background: '#8b5e3c', border: '2px solid #6b4020', padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[0, 1].map((row) => (
              <div key={row} style={{ display: 'flex', gap: 2 }}>
                {CHAIR_PALETTE.map((c) => (
                  <div key={c} style={{ width: 10, height: 14, background: c, border: '1px solid rgba(0,0,0,0.3)' }} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Floor */}
        <div style={{
          minHeight: 'calc(100vh - 160px)',
          background: '#52606e',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          padding: '44px 44px 64px',
          position: 'relative',
        }}>
          {/* CCr floor marks */}
          {[...Array(5)].map((_, r) => [...Array(7)].map((_, c) => (
            <div key={`${r}-${c}`} style={{ position: 'absolute', top: 90 + r * 130, left: 90 + c * 130, fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.04)', userSelect: 'none', letterSpacing: '0.1em' }}>CCr</div>
          )))}

          {/* Error bar */}
          {error && (
            <div style={{ marginBottom: 24, padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontFamily: 'monospace', fontSize: 11, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={13} /> {error} — <code>npm run server</code>
            </div>
          )}

          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}><RefreshCw size={16} className="animate-spin" /> Chargement...</div>
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 52, alignItems: 'flex-start' }}>
                {agents.map((agent) => (
                  <PixelDesk key={agent.id} agent={agent} selected={selectedId === agent.id}
                    onClick={() => setSelectedId(selectedId === agent.id ? null : agent.id)} />
                ))}
                <EmptySlot onClick={() => setShowCreate(true)} />
              </div>
            )}

          {/* Trash can */}
          <div style={{ position: 'absolute', bottom: 24, left: 24 }}>
            <div style={{ width: 26, height: 5, background: '#6a7a8a', border: '1px solid #4a5a6a', borderRadius: 2, margin: '0 auto' }} />
            <div style={{ width: 22, height: 28, background: '#5a6a7a', border: '2px solid #4a5a6a', margin: '0 auto', borderRadius: '0 0 3px 3px', position: 'relative' }}>
              {[6, 12, 18].map((x) => <div key={x} style={{ position: 'absolute', top: 4, left: x, width: 1, height: 18, background: '#4a5a6a' }} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <AgentPanel agent={selected} onClose={() => setSelectedId(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}

      {/* Create modal */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
