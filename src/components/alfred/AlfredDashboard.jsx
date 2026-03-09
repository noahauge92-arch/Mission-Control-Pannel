/**
 * AlfredDashboard — page dédiée au bot de trading Alfred
 * Stats, logs live, positions, P&L chart, skip reasons
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, decimals = 2) {
  const v = Number(n ?? 0)
  return (v >= 0 ? '+' : '') + v.toFixed(decimals)
}

function StatCard({ label, value, sub, color = '#94a3b8', icon }) {
  return (
    <div style={{
      background: '#0d111a', border: `1px solid ${color}25`,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a6080' }}>{sub}</div>}
    </div>
  )
}

// ── Mode Badge ─────────────────────────────────────────────────────────────────
function ModeBadge({ running, dryRun }) {
  if (!running) return (
    <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '4px 10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
      🔴 OFFLINE
    </span>
  )
  if (dryRun) return (
    <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '4px 10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b' }}>
      🟡 DRY-RUN
    </span>
  )
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '4px 10px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>
      🟢 LIVE
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AlfredDashboard() {
  const [state,     setState]     = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const logsRef = useRef(null)

  const fetchAll = useCallback(async () => {
    try {
      const [stateRes, analyticsRes, logsRes] = await Promise.all([
        fetch('/api/alfred'),
        fetch('/api/alfred/analytics'),
        fetch('/api/alfred/logs'),
      ])
      setState(await stateRes.json())
      setAnalytics(await analyticsRes.json())
      const ld = await logsRes.json()
      setLogs(Array.isArray(ld.lines) ? ld.lines : [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => {
    fetchAll()
    const poll = setInterval(fetchAll, 10_000)
    return () => clearInterval(poll)
  }, [fetchAll])

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  const handleRefresh = () => { setRefreshing(true); fetchAll() }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a6080', fontFamily: 'monospace', fontSize: 12 }}>
      Connexion à Alfred...
    </div>
  )

  const s         = state || {}
  const bank      = Number(s.bank ?? s.balance ?? 0)
  const pnl       = Number(s.allTimePnl ?? s.pnl_alltime ?? s.total_pnl ?? 0)
  const dailyPnl  = Number(s.dailyPnl ?? s.pnl_today ?? s.daily_pnl ?? 0)
  const trades    = s.totalTrades ?? s.total_trades ?? 0
  const wr        = s.winRate ?? (trades > 0 ? Math.round((s.wins ?? 0) / trades * 100) : 0)
  const regime    = (s.regime ?? s.market_regime ?? 'NORMAL').toUpperCase()
  const positions = s.positions ?? s.open_positions ?? []
  const running   = s.running ?? false
  const dryRun    = s.dryRun ?? false
  const halted    = s.halted ?? false

  const REGIME_COLORS = { NORMAL: '#22c55e', DEFENSIVE: '#f59e0b', AGGRESSIVE: '#ef4444', CAUTION: '#f59e0b' }
  const regimeColor = REGIME_COLORS[regime] || '#94a3b8'

  // Build P&L chart from analytics
  const pnlHistory = (() => {
    if (!analytics) return []
    const raw = analytics.pnl_history ?? analytics.history ?? analytics.daily ?? []
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.slice(-30).map((d, i) => ({
        i,
        pnl: Number(d.pnl ?? d.cumulative_pnl ?? d.value ?? 0),
        label: d.date ?? d.ts ?? i,
      }))
    }
    return []
  })()

  // Skip reasons
  const skipReasons = (() => {
    const sr = analytics?.skip_reasons ?? analytics?.skipReasons ?? {}
    return Object.entries(sr).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 6)
  })()

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#080b12', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.04em' }}>
              ALFRED
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a6080' }}>Trading Agent · Polymarket 24/7</div>
          </div>
          <ModeBadge running={running} dryRun={dryRun} />
          {halted && (
            <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              ⏸ HALTED
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 11 }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <StatCard label="Bank" value={`$${bank.toFixed(2)}`} color="#f59e0b" icon="🏦" sub="Capital total" />
        <StatCard
          label="P&L All-time" value={`${fmt(pnl)}$`}
          color={pnl >= 0 ? '#22c55e' : '#ef4444'}
          icon={pnl >= 0 ? '📈' : '📉'}
          sub={`Aujourd'hui: ${fmt(dailyPnl)}$`}
        />
        <StatCard label="Trades" value={trades} color="#3b82f6" icon="🎯" sub={`WR: ${wr}%`} />
        <StatCard label="Régime" value={regime} color={regimeColor} icon="📊" sub={`${positions.length} pos. ouvertes`} />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: pnlHistory.length > 0 ? '1fr 280px' : '1fr', gap: 12 }}>

        {/* P&L Chart */}
        {pnlHistory.length > 0 && (
          <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a6080', textTransform: 'uppercase', marginBottom: 10 }}>📈 Courbe P&L</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={pnlHistory}>
                <XAxis dataKey="i" hide />
                <YAxis width={50} tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#4a6080' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#0d111a', border: '1px solid #1a2236', fontFamily: 'monospace', fontSize: 10 }}
                  formatter={(v) => [`${fmt(v)}$`, 'P&L']}
                />
                <Line type="monotone" dataKey="pnl" stroke={pnl >= 0 ? '#22c55e' : '#ef4444'} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Skip reasons */}
        {skipReasons.length > 0 && (
          <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a6080', textTransform: 'uppercase', marginBottom: 10 }}>🚫 Skip Reasons</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={skipReasons} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontFamily: 'monospace', fontSize: 8, fill: '#4a6080' }} />
                <Tooltip contentStyle={{ background: '#0d111a', border: '1px solid #1a2236', fontFamily: 'monospace', fontSize: 10 }} />
                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                  {skipReasons.map((_, i) => <Cell key={i} fill={`hsl(${220 + i * 20}, 70%, 55%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Positions ── */}
      {positions.length > 0 && (
        <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: 10, color: '#4a6080', textTransform: 'uppercase' }}>
            📍 Positions ouvertes ({positions.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Marché', 'Side', 'Taille', 'P&L estimé', 'Prob'].map((h) => (
                    <th key={h} style={{ padding: '6px 14px', textAlign: 'left', color: '#4a6080', fontWeight: 600, fontSize: 9, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.slice(0, 8).map((p, i) => {
                  const positionPnl = Number(p.pnl ?? p.unrealized_pnl ?? 0)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 14px', color: '#c8d8e8', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(p.market ?? p.question ?? `Position ${i + 1}`).slice(0, 50)}
                      </td>
                      <td style={{ padding: '7px 14px', color: (p.side ?? p.outcome ?? '') === 'YES' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                        {(p.side ?? p.outcome ?? '?').toUpperCase()}
                      </td>
                      <td style={{ padding: '7px 14px', color: '#94a3b8' }}>${Number(p.size ?? p.amount ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '7px 14px', color: positionPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                        {fmt(positionPnl)}$
                      </td>
                      <td style={{ padding: '7px 14px', color: '#94a3b8' }}>
                        {p.prob != null ? `${(Number(p.prob) * 100).toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Logs ── */}
      <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: 10, color: '#4a6080', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
          <span>📋 Logs live</span>
          <span style={{ color: '#2a3a50' }}>auto-refresh 10s</span>
        </div>
        <div
          ref={logsRef}
          style={{ height: 180, overflowY: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {logs.length === 0 ? (
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#2a3a50' }}>Aucun log. Alfred n&apos;est peut-être pas démarré.</span>
          ) : (
            logs.map((line, i) => {
              const color = line.includes('ERROR') || line.includes('error') ? '#ef4444'
                : line.includes('WARN') ? '#f59e0b'
                : line.includes('trade') || line.includes('BUY') || line.includes('SELL') ? '#22c55e'
                : '#4a6080'
              return (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 10, color, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {line}
                </div>
              )
            })
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
