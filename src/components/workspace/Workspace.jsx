/*
 * ════════════════════════════════════════════════════════════════════════════
 * WORKSPACE — Visual Agent Orchestration
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
import { Plus, X, Trash2, Play, Square, Edit2, RefreshCw, AlertCircle, Crown, Rocket } from 'lucide-react'
import { useStore } from '../../store/useStore'

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  running: { color: '#22c55e', label: 'RUNNING', pulse: true  },
  idle:    { color: '#94a3b8', label: 'IDLE',    pulse: false },
  stopped: { color: '#ef4444', label: 'OFFLINE', pulse: false },
  error:   { color: '#f59e0b', label: 'ERROR',   pulse: true  },
  offline: { color: '#ef4444', label: 'OFFLINE', pulse: false },
}

const CHAIR_PALETTE = [
  '#ef4444','#22c55e','#3b82f6','#f59e0b',
  '#a855f7','#06b6d4','#ec4899','#f97316',
]

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function trunc(str, n) {
  const s = String(str ?? '')
  return s.length > n ? s.slice(0, n) : s
}

// ── CSS animations (injected once) ───────────────────────────────────────────
const STYLE_ID = 'workspace-animations'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes ws-typing {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(2deg); }
      75% { transform: rotate(-2deg); }
    }
    @keyframes ws-glow {
      0%, 100% { box-shadow: 0 0 6px rgba(34,197,94,0.3); }
      50% { box-shadow: 0 0 16px rgba(34,197,94,0.6); }
    }
    @keyframes ws-pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `
  document.head.appendChild(style)
}

// ── Pixel Character SVG (32x32) ──────────────────────────────────────────────
function PixelCharacter({ color, icon, animate }) {
  return (
    <svg
      width="32" height="32" viewBox="0 0 32 32"
      style={{
        animation: animate ? 'ws-typing 0.8s ease-in-out infinite' : 'none',
        transformOrigin: 'center bottom',
      }}
    >
      {/* Head */}
      <rect x="12" y="2" width="8" height="8" fill="#f5c6a0" stroke="#c48a60" strokeWidth="0.5" />
      {/* Eyes */}
      <rect x="14" y="5" width="2" height="2" fill="#2a2a3a" />
      <rect x="18" y="5" width="2" height="2" fill="#2a2a3a" />
      {/* Body */}
      <rect x="10" y="10" width="12" height="12" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      {/* T-shirt icon */}
      <text x="16" y="19" textAnchor="middle" fontSize="7" fill="white" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}>
        {icon}
      </text>
      {/* Arms */}
      <rect x="6" y="11" width="4" height="8" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      <rect x="22" y="11" width="4" height="8" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      {/* Hands */}
      <rect x="6" y="19" width="4" height="3" fill="#f5c6a0" />
      <rect x="22" y="19" width="4" height="3" fill="#f5c6a0" />
      {/* Legs */}
      <rect x="11" y="22" width="4" height="8" fill="#3a4a6a" />
      <rect x="17" y="22" width="4" height="8" fill="#3a4a6a" />
      {/* Shoes */}
      <rect x="10" y="29" width="5" height="3" fill="#2a2a2a" />
      <rect x="17" y="29" width="5" height="3" fill="#2a2a2a" />
    </svg>
  )
}

// ── PixelDesk ─────────────────────────────────────────────────────────────────
function PixelDesk({ agent, selected, onClick, onToggle, deskLogs, isSystem, processAlive }) {
  const rawStatus = processAlive === false ? 'offline' : agent.status
  const s   = STATUS_CFG[rawStatus] || STATUS_CFG.idle
  const chair = agent.color || '#ef4444'
  const logs  = deskLogs || []
  const isRunning = rawStatus === 'running'
  const isOffline = rawStatus === 'offline' || rawStatus === 'stopped'
  const tshirtIcon = agent.id === 'alfred-trading' ? '⚙' : agent.id === 'balthazar' ? '📰' : '🤖'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        onClick={onClick}
        title={`${agent.name} — ${s.label}`}
        style={{
          position: 'relative', width: 148, cursor: 'pointer', userSelect: 'none',
          filter: selected ? 'drop-shadow(0 0 10px #f59e0b)' : undefined,
          transition: 'filter 0.15s',
        }}
      >
        {/* Status LED */}
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 10,
          width: 9, height: 9, background: s.color,
          border: '1.5px solid rgba(0,0,0,0.5)', boxShadow: `0 0 6px ${s.color}`,
          animation: s.pulse ? 'ws-pulse-dot 1.5s infinite' : 'none',
        }} />

        {isSystem && (
          <div style={{ position: 'absolute', top: 5, left: 6, zIndex: 10, fontSize: 10, color: '#f59e0b' }}>⚙</div>
        )}

        {/* Desk surface */}
        <div style={{
          background: '#c49a6c', border: '2px solid #8b6030',
          boxShadow: '0 4px 0 #6b4020, 3px 0 0 #a07848, inset 0 1px 0 rgba(255,255,255,0.25)',
          padding: '10px 10px 8px', position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }} />

          {/* Monitor */}
          <div style={{
            background: '#1a1a2e', border: '2px solid #2a2a4a',
            width: 110, height: 58, margin: '0 auto 6px', position: 'relative', overflow: 'hidden',
            animation: isRunning ? 'ws-glow 2s ease-in-out infinite' : 'none',
          }}>
            {/* Log lines overlay (highest priority) */}
            {logs.length > 0 ? (
              <svg viewBox="0 0 110 58" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <rect width="110" height="58" fill={isRunning ? '#020e06' : '#020810'} />
                {logs.slice(-3).map((line, i) => {
                  const clean = line.replace(/\x1B\[[0-9;]*m/g, '').replace(/^\[.*?\]\s*/, '').trim()
                  const color = /error/i.test(line) ? '#ef4444' : /warn/i.test(line) ? '#f59e0b' : '#22c55e'
                  return (
                    <text key={i} x="3" y={13 + i * 16} fill={color} fontSize="7" fontFamily="monospace" opacity="0.85">
                      {trunc(clean, 16)}
                    </text>
                  )
                })}
              </svg>
            ) : isRunning ? (
              <svg viewBox="0 0 110 58" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <rect width="110" height="58" fill="#041a0e" />
                <polyline points="2,52 18,40 30,46 46,28 62,35 78,18 94,24 110,10" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.8" />
                <text x="4" y="12" fill="#22c55e" fontSize="7" fontFamily="monospace" opacity="0.7">LIVE</text>
              </svg>
            ) : isOffline ? (
              <svg viewBox="0 0 110 58" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <rect width="110" height="58" fill="#080808" />
              </svg>
            ) : (
              <svg viewBox="0 0 110 58" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <rect width="110" height="58" fill="#0a0a12" />
                <text x="14" y="33" fill="#3a4a6a" fontSize="8" fontFamily="monospace">STANDBY</text>
              </svg>
            )}
            <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 10, height: 4, background: '#2a2a3a' }} />
          </div>

          {/* Keyboard */}
          <div style={{ background: '#3a3a4a', border: '1px solid #222', height: 13, position: 'relative' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ position: 'absolute', top: 2 + i * 4, left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.12)' }} />
            ))}
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

        {/* Character or empty chair */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4 }}>
          {!isOffline ? (
            <>
              {/* Character sitting */}
              <div style={{ marginBottom: -6, zIndex: 5, position: 'relative' }}>
                <PixelCharacter color={chair} icon={tshirtIcon} animate={isRunning} />
              </div>
              {/* Chair behind character */}
              <div style={{ width: 46, height: 20, background: chair, border: '2px solid rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), 0 3px 0 rgba(0,0,0,0.3)', marginTop: -8 }} />
            </>
          ) : (
            <>
              {/* Empty chair */}
              <div style={{ width: 36, height: 10, background: chair, border: '2px solid rgba(0,0,0,0.3)', borderBottom: 'none', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2)', opacity: 0.5 }} />
              <div style={{ width: 46, height: 34, background: chair, border: '2px solid rgba(0,0,0,0.3)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), 0 3px 0 rgba(0,0,0,0.3)', opacity: 0.5 }} />
            </>
          )}
          <div style={{ width: 54, height: 5, background: '#7a7a8a', border: '1px solid #555', boxShadow: '0 2px 0 #444' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 52, marginTop: 2 }}>
            {[0,1,2,3,4].map((i) => <div key={i} style={{ width: 7, height: 7, background: '#555', border: '1px solid #333', borderRadius: '50%' }} />)}
          </div>
        </div>

        {/* Name + role label */}
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#c8d8e8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
            {agent.name}
          </div>
          {agent.role && (
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#4a6080', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
              {agent.role}
            </div>
          )}
          <div style={{
            fontFamily: 'monospace', fontSize: 9, color: s.color, marginTop: 2,
            animation: s.pulse ? 'ws-pulse-dot 1.5s infinite' : 'none',
          }}>
            ● {s.label}
          </div>
        </div>

        {selected && <div style={{ position: 'absolute', inset: -3, border: '2px solid #f59e0b', pointerEvents: 'none', boxShadow: '0 0 12px rgba(245,158,11,0.35)' }} />}
      </div>

      {/* Inline Start/Stop button */}
      {onToggle && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(agent.id) }}
          style={{
            marginTop: 8,
            background: agent.status === 'running' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
            border: `1px solid ${agent.status === 'running' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
            color: agent.status === 'running' ? '#ef4444' : '#22c55e',
            fontFamily: 'monospace', fontSize: 10, padding: '4px 14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {agent.status === 'running' ? <><Square size={9} /> STOP</> : <><Play size={9} /> START</>}
        </button>
      )}
    </div>
  )
}

// ── EmptySlot ─────────────────────────────────────────────────────────────────
function EmptySlot({ onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: 148, height: 260, border: `2px dashed ${hover ? '#f59e0b' : '#2a3a50'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: hover ? 'rgba(245,158,11,0.04)' : 'transparent', transition: 'all 0.15s', gap: 10 }}
    >
      <div style={{ width: 36, height: 36, border: `2px dashed ${hover ? '#f59e0b' : '#2a3a50'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hover ? '#f59e0b' : '#2a3a50', transition: 'all 0.15s' }}>
        <Plus size={18} />
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: hover ? '#f59e0b' : '#2a3a50', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Agent</div>
    </div>
  )
}

// ── BossDesk ──────────────────────────────────────────────────────────────────
function BossDesk({ boss, onSave, onDispatch, dispatching, tasks }) {
  const [objective, setObjective] = useState(boss?.currentObjective || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setObjective(boss?.currentObjective || '') }, [boss?.currentObjective])

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/boss', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentObjective: objective }),
      })
      const updated = await r.json()
      setSaved(true)
      onSave?.(updated)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length
  const assignments = boss?.assignments || []

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(160,90,0,0.10) 100%)',
      borderBottom: '2px solid rgba(245,158,11,0.25)',
      padding: '16px 28px 14px',
    }}>
      {/* Boss header with crown character */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            {/* Crown */}
            <polygon points="14,12 16,4 20,10 24,2 28,10 32,4 34,12" fill="#f59e0b" stroke="#b97a00" strokeWidth="0.5" />
            <rect x="14" y="12" width="20" height="4" fill="#f59e0b" stroke="#b97a00" strokeWidth="0.5" />
            {/* Head */}
            <rect x="18" y="16" width="12" height="10" fill="#f5c6a0" stroke="#c48a60" strokeWidth="0.5" />
            {/* Eyes */}
            <rect x="20" y="20" width="2" height="2" fill="#2a2a3a" />
            <rect x="26" y="20" width="2" height="2" fill="#2a2a3a" />
            {/* Smile */}
            <rect x="22" y="23" width="4" height="1" fill="#c48a60" />
            {/* Body */}
            <rect x="16" y="26" width="16" height="14" fill="#f59e0b" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
            <text x="24" y="36" textAnchor="middle" fontSize="8" fill="white">👑</text>
            {/* Arms */}
            <rect x="10" y="27" width="6" height="8" fill="#f59e0b" />
            <rect x="32" y="27" width="6" height="8" fill="#f59e0b" />
            {/* Legs */}
            <rect x="17" y="40" width="5" height="8" fill="#2a3a5a" />
            <rect x="26" y="40" width="5" height="8" fill="#2a3a5a" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              BABY BOSS
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b4420', letterSpacing: '0.06em', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', border: '1px solid rgba(245,158,11,0.2)' }}>
              CHEF DE PROJET
            </span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748b', marginTop: 3, display: 'flex', gap: 12 }}>
            <span>📋 {todoCount} todo</span>
            <span>🔄 {inProgressCount} in-progress</span>
            {assignments.length > 0 && <span>📨 {assignments.length} assigned</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, background: '#f59e0b', boxShadow: '0 0 6px #f59e0b', borderRadius: '50%', animation: 'ws-pulse-dot 1.5s infinite' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#f59e0b' }}>ACTIVE</span>
        </div>
      </div>

      {/* Objective + Dispatch */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Objectif actuel
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Définir l'objectif du boss… ex: 'Maximiser le P&L en gardant le risque < 5%'"
            rows={2}
            style={{
              width: '100%', background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(245,158,11,0.22)',
              color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12,
              padding: '7px 10px', boxSizing: 'border-box', resize: 'none', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 1 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saved ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.13)',
              border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.35)'}`,
              color: saved ? '#22c55e' : '#f59e0b',
              fontFamily: 'monospace', fontSize: 11, padding: '6px 14px',
              cursor: saving ? 'default' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {saving ? '...' : saved ? '✓ Saved' : 'Save'}
          </button>
          <button
            onClick={onDispatch}
            disabled={dispatching || todoCount === 0}
            style={{
              background: 'rgba(59,130,246,0.13)',
              border: '1px solid rgba(59,130,246,0.35)',
              color: todoCount === 0 ? '#4a5a70' : '#3b82f6',
              fontFamily: 'monospace', fontSize: 10, padding: '5px 10px',
              cursor: dispatching || todoCount === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              opacity: todoCount === 0 ? 0.5 : 1,
            }}
          >
            <Rocket size={11} /> {dispatching ? '...' : 'Dispatch'}
          </button>
        </div>
      </div>

      {/* Assignments display */}
      {assignments.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {assignments.map((a, i) => (
            <div key={i} style={{
              fontFamily: 'monospace', fontSize: 9, padding: '3px 8px',
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              color: '#8aa8d0', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ color: '#3b82f6' }}>→</span>
              <span style={{ color: '#94a3b8' }}>{trunc(a.taskTitle, 20)}</span>
              <span style={{ color: '#6a8ab0' }}>⇒ {a.agentName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DispatchArrows ────────────────────────────────────────────────────────────
function DispatchArrows({ count }) {
  if (count === 0) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: 28, padding: '8px 0',
      background: 'rgba(245,158,11,0.02)',
    }}>
      {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.3 + (i % 3) * 0.1 }}>
          {[0, 1, 2].map((j) => (
            <div key={j} style={{
              width: 0, height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `6px solid rgba(245,158,11,${0.4 + j * 0.15})`,
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── AgentPanel ────────────────────────────────────────────────────────────────
function AgentPanel({ agent, onClose, onUpdate, onDelete, alfredData }) {
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: agent.name, role: agent.role || '', color: agent.color || '#ef4444' })
  const s = STATUS_CFG[agent.status] || STATUS_CFG.idle

  useEffect(() => {
    setForm({ name: agent.name, role: agent.role || '', color: agent.color || '#ef4444' })
    setEditing(false)
  }, [agent.id])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try { const r = await fetch(`/api/agents/${agent.id}/logs`); setLogs((await r.json()).lines || []) }
    catch { setLogs([]) }
    finally { setLogsLoading(false) }
  }, [agent.id])

  // Poll logs every 5s
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const toggleStatus = () => onUpdate?.(agent.id, { status: agent.status === 'running' ? 'stopped' : 'running' })
  const save = async () => { await onUpdate?.(agent.id, form); setEditing(false) }

  const Mono = (p) => ({ fontFamily: 'monospace', ...p })
  const isAlfred = agent.id === 'alfred-trading'

  return (
    <div style={{ width: 320, height: '100%', background: '#0d111a', borderLeft: '1px solid #1a2236', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid #1a2236' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {agent.isSystem && <span style={{ fontSize: 12 }}>⚙</span>}
            <div style={{ width: 9, height: 9, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            <span style={Mono({ fontSize: 13, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' })}>{agent.name}</span>
          </div>
          <div style={Mono({ fontSize: 11, color: s.color, marginTop: 2 })}>{s.label}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {!editing ? (
          <>
            <PanelSection label="Role">
              <div style={Mono({ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 })}>
                {agent.role || <span style={{ color: '#2a3a50', fontStyle: 'italic' }}>No role defined</span>}
              </div>
            </PanelSection>

            {/* Alfred-specific data */}
            {isAlfred && alfredData && (
              <PanelSection label="Alfred Live">
                <div style={{ background: '#060810', border: '1px solid #1a2236', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Bank', alfredData.bank ?? alfredData.balance, '#22c55e'],
                    ['P&L Today', alfredData.pnl_today ?? alfredData.daily_pnl, '#3b82f6'],
                    ['Regime', alfredData.regime ?? alfredData.market_regime, '#f59e0b'],
                    ['Positions', (alfredData.open_positions ?? []).length, '#a855f7'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={Mono({ fontSize: 10, color: '#64748b' })}>{label}</span>
                      <span style={Mono({ fontSize: 10, color, fontWeight: 700 })}>
                        {val != null ? String(val) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </PanelSection>
            )}

            <PanelSection label="Logs (live 5s)" extra={
              <button onClick={fetchLogs} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>
                <RefreshCw size={11} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            }>
              <div style={{ background: '#060810', border: '1px solid #1a2236', height: 220, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10 }}>
                {logsLoading && logs.length === 0
                  ? <div style={{ padding: 10, color: '#64748b' }}>Loading...</div>
                  : logs.length === 0
                  ? <div style={{ padding: 10, color: '#2a3a50' }}>No logs found.</div>
                  : logs.map((line, i) => (
                    <div key={i} style={{ padding: '2px 8px', color: /error/i.test(line) ? '#ef4444' : /warn/i.test(line) ? '#f59e0b' : '#64748b', borderBottom: '1px solid #0d111e', lineHeight: 1.6, wordBreak: 'break-all' }}>
                      {line}
                    </div>
                  ))
                }
              </div>
            </PanelSection>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={Mono({ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 })}>Name *</label>
              <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={Mono({ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box' })} />
            </div>
            <div>
              <label style={Mono({ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 })}>Role</label>
              <textarea rows={3} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                style={Mono({ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box', resize: 'none' })} />
            </div>
            <div>
              <label style={Mono({ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 })}>Chair Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CHAIR_PALETTE.map((c) => (
                  <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    style={{ width: 26, height: 26, background: c, cursor: 'pointer', border: form.color === c ? '3px solid #f59e0b' : '2px solid transparent', boxShadow: form.color === c ? '0 0 6px #f59e0b' : 'none', transition: 'all 0.1s' }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2236', display: 'flex', gap: 8 }}>
        {!editing ? (
          <>
            {!agent.isSystem && onUpdate && (
              <PanelBtn onClick={toggleStatus} color={agent.status === 'running' ? '#ef4444' : '#22c55e'} style={{ flex: 1 }}>
                {agent.status === 'running' ? <><Square size={11} /> Stop</> : <><Play size={11} /> Start</>}
              </PanelBtn>
            )}
            {!agent.isSystem && (
              <>
                <PanelBtn onClick={() => setEditing(true)} color="#f59e0b"><Edit2 size={11} /> Edit</PanelBtn>
                {onDelete && <PanelBtn onClick={() => onDelete(agent.id)} color="#ef4444" dim><Trash2 size={11} /></PanelBtn>}
              </>
            )}
            {agent.isSystem && (
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a5a70', padding: '7px 4px' }}>
                Agent système — lecture seule
              </div>
            )}
          </>
        ) : (
          <>
            <PanelBtn onClick={save} color="#22c55e" style={{ flex: 1 }} disabled={!form.name.trim()}>Save</PanelBtn>
            <PanelBtn onClick={() => setEditing(false)} color="#64748b">Cancel</PanelBtn>
          </>
        )}
      </div>
    </div>
  )
}

function PanelSection({ label, children, extra }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {label}{extra}
      </div>
      {children}
    </div>
  )
}

function PanelBtn({ onClick, color, children, style, disabled, dim }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: `rgba(${hexToRgb(color)},${dim ? '0.07' : '0.1'})`, border: `1px solid rgba(${hexToRgb(color)},${dim ? '0.2' : '0.3'})`, color, cursor: disabled ? 'default' : 'pointer', fontFamily: 'monospace', fontSize: 11, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5, opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  )
}

// ── CreateModal ───────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', role: '', color: '#ef4444' })

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
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Rôle</label>
            <textarea rows={2} placeholder="Ce que fait cet agent…" value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              style={{ width: '100%', background: '#1a2236', border: '1px solid #2a3a50', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', boxSizing: 'border-box', resize: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Couleur de Chaise</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CHAIR_PALETTE.map((c) => (
                <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{ width: 30, height: 30, background: c, cursor: 'pointer', border: form.color === c ? '3px solid #f59e0b' : '2px solid transparent', boxShadow: form.color === c ? '0 0 8px #f59e0b' : 'none', transition: 'all 0.1s' }} />
              ))}
            </div>
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
  const alfred = useStore((s) => s.alfred)

  const [agents, setAgents]           = useState([])
  const [boss, setBoss]               = useState(null)
  const [tasks, setTasks]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedId, setSelectedId]   = useState(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [error, setError]             = useState(null)
  const [logsMap, setLogsMap]         = useState({})
  const [processStatus, setProcessStatus] = useState({})
  const [dispatching, setDispatching] = useState(false)

  // System agents (non-deletable)
  const alfredAgent = {
    id:       'alfred-trading',
    name:     'Alfred',
    role:     'Trading Agent — Polymarket 24/7',
    color:    '#f59e0b',
    status:   processStatus.alfred ? 'running' : alfred?.status === 'running' ? 'running' : 'idle',
    isSystem: true,
  }

  const balthazarAgent = {
    id:       'balthazar',
    name:     'Balthazar',
    role:     'Coding — site web & apps via GitHub',
    color:    '#3b82f6',
    status:   processStatus.balthazar ? 'running' : 'idle',
    isSystem: true,
  }

  const fetchAll = useCallback(async () => {
    try {
      const [agentsRes, bossRes, tasksRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/boss').catch(() => null),
        fetch('/api/tasks').catch(() => null),
      ])
      setAgents(Array.isArray(await agentsRes.clone().json().catch(() => [])) ? await agentsRes.json() : [])
      if (bossRes?.ok) setBoss(await bossRes.json())
      if (tasksRes?.ok) setTasks(await tasksRes.json())
      setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Poll process status every 10s
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/agents/status')
        setProcessStatus(await r.json())
      } catch { /* ignore */ }
    }
    poll()
    const interval = setInterval(poll, 10_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch desk logs
  useEffect(() => {
    const ids = ['alfred-trading', 'balthazar', ...agents.map((a) => a.id)]
    if (!ids.length) return
    const run = async () => {
      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await fetch(`/api/agents/${id}/logs`)
            const d = await r.json()
            return [id, (d.lines || []).slice(-3)]
          } catch { return [id, []] }
        })
      )
      setLogsMap(Object.fromEntries(pairs))
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length, processStatus.alfred, processStatus.balthazar])

  const handleCreate = async (form) => {
    try {
      const r = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const agent = await r.json()
      setAgents((a) => [...a, agent])
      setSelectedId(agent.id)
      setShowCreate(false)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const handleUpdate = async (id, updates) => {
    try {
      const r = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
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

  const handleToggle = (id) => {
    const agent = agents.find((a) => a.id === id)
    if (agent) handleUpdate(id, { status: agent.status === 'running' ? 'stopped' : 'running' })
  }

  const handleDispatch = async () => {
    setDispatching(true)
    try {
      const r = await fetch('/api/boss/dispatch', { method: 'POST' })
      const result = await r.json()
      // Refresh boss + tasks
      const [bossRes, tasksRes] = await Promise.all([
        fetch('/api/boss'),
        fetch('/api/tasks'),
      ])
      setBoss(await bossRes.json())
      setTasks(await tasksRes.json())
      if (result.dispatched > 0) {
        alert(`Baby Boss a dispatché ${result.dispatched} tâche(s) !`)
      }
    } catch (e) { alert('Dispatch error: ' + e.message) }
    finally { setDispatching(false) }
  }

  const allDesks = [alfredAgent, balthazarAgent, ...agents]
  const selected = allDesks.find((a) => a.id === selectedId)

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', background: '#080b12' }}>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>

        {/* Top wall */}
        <div style={{
          background: 'linear-gradient(180deg, #c4896b 0%, #b87850 100%)',
          borderBottom: '4px solid #7a4828',
          padding: '12px 28px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
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

        {/* Boss section */}
        <BossDesk boss={boss} onSave={setBoss} onDispatch={handleDispatch} dispatching={dispatching} tasks={tasks} />

        {/* Dispatch arrows */}
        <DispatchArrows count={allDesks.length} />

        {/* Floor */}
        <div style={{
          minHeight: 'calc(100vh - 320px)',
          background: '#52606e',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          padding: '44px 44px 80px',
          position: 'relative',
        }}>
          {error && (
            <div style={{ marginBottom: 24, padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontFamily: 'monospace', fontSize: 11, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={13} /> {error} — <code>npm run server</code>
            </div>
          )}

          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}><RefreshCw size={16} className="animate-spin" /> Chargement...</div>
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 52, alignItems: 'flex-start' }}>
                {allDesks.map((agent) => (
                  <PixelDesk
                    key={agent.id}
                    agent={agent}
                    selected={selectedId === agent.id}
                    onClick={() => setSelectedId(selectedId === agent.id ? null : agent.id)}
                    onToggle={agent.isSystem ? undefined : handleToggle}
                    deskLogs={logsMap[agent.id]}
                    isSystem={agent.isSystem}
                    processAlive={agent.isSystem ? processStatus[agent.id === 'alfred-trading' ? 'alfred' : 'balthazar'] : undefined}
                  />
                ))}
                <EmptySlot onClick={() => setShowCreate(true)} />
              </div>
            )
          }

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
        <AgentPanel
          agent={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={selected.isSystem ? undefined : handleUpdate}
          onDelete={selected.isSystem ? undefined : handleDelete}
          alfredData={alfred}
        />
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
