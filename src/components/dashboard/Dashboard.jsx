import React from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, ShieldAlert,
  Activity, BarChart2, Clock, AlertCircle, CheckCircle2,
  RefreshCw, WifiOff, ChevronRight, Target, XCircle,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  const abs = Math.abs(n)
  const str = abs >= 1000 ? `$${(abs / 1000).toFixed(2)}k` : `$${abs.toFixed(2)}`
  return n < 0 ? `-${str}` : `+${str}`
}

const fmtBank = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtPct = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return `${(n * 100 <= 1 ? (n * 100).toFixed(1) : n.toFixed(1))}%`
}

const fmtTime = (v) => {
  if (!v) return '—'
  try { return new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return String(v) }
}

const REGIME_CONFIG = {
  NORMAL:   { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',  icon: '●' },
  CAUTION:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', icon: '▲' },
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: '■' },
  RECOVERY: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', icon: '↻' },
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const alfred      = useStore((s) => s.alfred)
  const loading     = useStore((s) => s.alfredLoading)
  const error       = useStore((s) => s.alfredError)
  const lastUpdated = useStore((s) => s.alfredLastUpdated)

  if (loading) return <LoadingState />
  if (error && !alfred) return <ErrorState error={error} />

  // — Safe accessors with fallbacks —
  const bank       = alfred?.bank        ?? alfred?.balance      ?? alfred?.capital
  const pnlToday   = alfred?.pnl_today   ?? alfred?.daily_pnl   ?? alfred?.pnl_24h
  const pnlAllTime = alfred?.pnl_alltime ?? alfred?.total_pnl    ?? alfred?.cumulative_pnl
  const regime     = (alfred?.regime     ?? alfred?.market_regime ?? '—').toString().toUpperCase()
  const winRaw     = alfred?.win_rate    ?? alfred?.winrate       ?? alfred?.win_ratio
  const totalTrades = alfred?.total_trades ?? alfred?.trades_count ?? 0
  const openPositions = alfred?.open_positions ?? alfred?.positions ?? alfred?.active_positions ?? []
  const skipReasons   = alfred?.skip_reasons   ?? alfred?.skipped    ?? {}
  const lastTrades    = alfred?.last_trades    ?? alfred?.recent_trades ?? alfred?.trades ?? []
  const botStatus     = alfred?.status         ?? alfred?.bot_status   ?? 'unknown'
  const winRate       = winRaw != null
    ? (Number(winRaw) <= 1 ? Number(winRaw) * 100 : Number(winRaw))
    : null

  const rc = REGIME_CONFIG[regime] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', icon: '?' }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 mc-grid-bg">
      {/* ── Error banner (data stale but available) ── */}
      {error && alfred && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle size={13} className="text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300">{error} — showing last known data</span>
          {lastUpdated && (
            <span className="ml-auto text-[10px] text-mc-muted font-mono">
              Last sync: {fmtTime(lastUpdated)}
            </span>
          )}
        </div>
      )}

      {/* ── Row 1 — Key metrics ── */}
      <div className="grid grid-cols-5 gap-3">
        {/* Bank */}
        <MetricCard
          icon={<DollarSign size={17} />}
          label="Bank"
          value={fmtBank(bank)}
          sub={`Statut: ${botStatus}`}
          color="green"
          big
        />
        {/* P&L Today */}
        <MetricCard
          icon={<Activity size={17} />}
          label="P&L Aujourd'hui"
          value={fmt$(pnlToday)}
          sub="depuis 00:00"
          color={Number(pnlToday) >= 0 ? 'green' : 'red'}
          pnl
        />
        {/* P&L All-Time */}
        <MetricCard
          icon={<TrendingUp size={17} />}
          label="P&L All-Time"
          value={fmt$(pnlAllTime)}
          sub={`${totalTrades} trades`}
          color={Number(pnlAllTime) >= 0 ? 'green' : 'red'}
          pnl
        />
        {/* Win Rate */}
        <MetricCard
          icon={<Target size={17} />}
          label="Win Rate"
          value={winRate != null ? `${winRate.toFixed(1)}%` : '—'}
          sub={`${totalTrades} trades total`}
          color={winRate >= 55 ? 'green' : winRate >= 45 ? 'amber' : 'red'}
        />
        {/* Regime */}
        <div
          className="rounded-lg p-4 border mc-hover relative overflow-hidden"
          style={{ background: rc.bg, borderColor: rc.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={17} style={{ color: rc.color }} />
          </div>
          <div
            className="text-2xl font-bold font-mono mb-0.5 tracking-wider"
            style={{ color: rc.color }}
          >
            {rc.icon} {regime}
          </div>
          <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide">Régime</div>
          {lastUpdated && (
            <div className="text-[9px] text-mc-subtle mt-1 font-mono">
              sync {fmtTime(lastUpdated)}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2 — Positions + Skip reasons ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Open Positions */}
        <div className="col-span-2 mc-panel flex flex-col" style={{ minHeight: '200px' }}>
          <div className="mc-panel-header">
            <div className="flex items-center gap-2">
              <BarChart2 size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-mc-text">Positions Ouvertes</span>
              <span className="tag tag-amber text-[10px]">{openPositions.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {openPositions.length === 0 ? (
              <div className="flex items-center justify-center h-full py-8 text-[12px] text-mc-muted">
                Aucune position ouverte
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-mc-border">
                    {['Marché', 'Side', 'Montant', 'Entry', 'Current', 'P&L'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-mc-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((pos, i) => {
                    const posName = pos.market ?? pos.question ?? pos.title ?? `Position ${i + 1}`
                    const side = (pos.side ?? pos.outcome ?? '?').toString().toUpperCase()
                    const amount = pos.amount ?? pos.size ?? pos.stake
                    const entry = pos.entry_price ?? pos.entry ?? pos.price
                    const current = pos.current_price ?? pos.current ?? pos.mark_price
                    const pnl = pos.pnl ?? pos.unrealized_pnl ?? pos.profit

                    return (
                      <tr key={i} className="border-b border-mc-border/40 hover:bg-mc-panel/50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="text-[11px] text-mc-text max-w-[220px] truncate" title={posName}>
                            {posName}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={clsx('tag text-[10px]', side === 'YES' ? 'tag-green' : side === 'NO' ? 'tag-red' : 'tag-gray')}>
                            {side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-mc-text">
                          {amount != null ? `$${Number(amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-mc-muted">
                          {entry != null ? `${(Number(entry) * 100).toFixed(1)}¢` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-mc-muted">
                          {current != null ? `${(Number(current) * 100).toFixed(1)}¢` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono">
                          {pnl != null ? (
                            <span className={Number(pnl) >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {fmt$(pnl)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Skip reasons */}
        <div className="mc-panel flex flex-col">
          <div className="mc-panel-header">
            <div className="flex items-center gap-2">
              <XCircle size={13} className="text-amber-400" />
              <span className="text-[12px] font-semibold text-mc-text">Skip Reasons</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {Object.keys(skipReasons).length === 0 ? (
              <div className="text-[11px] text-mc-muted text-center py-4">Aucun skip</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(skipReasons)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([reason, count]) => {
                    const total = Object.values(skipReasons).reduce((s, v) => s + Number(v), 0)
                    const pct = total > 0 ? (Number(count) / total) * 100 : 0
                    return (
                      <div key={reason}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-mc-muted capitalize">
                            {reason.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-amber-300">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-mc-border overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: '#f59e0b', opacity: 0.7 }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3 — Last trades ── */}
      <div className="mc-panel flex flex-col">
        <div className="mc-panel-header">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-amber-400" />
            <span className="text-[12px] font-semibold text-mc-text">Derniers Trades</span>
          </div>
          <span className="text-[10px] text-mc-muted font-mono">
            {lastTrades.length} entrée{lastTrades.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          {lastTrades.length === 0 ? (
            <div className="text-center py-6 text-[12px] text-mc-muted">Aucun trade récent</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-mc-border">
                  {['Heure', 'Marché', 'Side', 'Montant', 'Entry', 'Exit', 'P&L', 'Résultat'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-mc-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lastTrades.slice(0, 20).map((trade, i) => {
                  const name = trade.market ?? trade.question ?? trade.title ?? `Trade ${i + 1}`
                  const side = (trade.side ?? trade.outcome ?? '?').toString().toUpperCase()
                  const amount = trade.amount ?? trade.size ?? trade.stake
                  const entry = trade.entry_price ?? trade.entry ?? trade.buy_price
                  const exit = trade.exit_price ?? trade.exit ?? trade.sell_price
                  const pnl = trade.pnl ?? trade.profit ?? trade.realized_pnl
                  const result = trade.status ?? trade.result ?? (Number(pnl) >= 0 ? 'won' : 'lost')
                  const ts = trade.timestamp ?? trade.time ?? trade.closed_at ?? trade.date

                  return (
                    <tr key={i} className="border-b border-mc-border/40 hover:bg-mc-panel/50 transition-colors">
                      <td className="px-3 py-2.5 text-[10px] font-mono text-mc-subtle whitespace-nowrap">
                        {fmtTime(ts)}
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <div className="text-[11px] text-mc-text truncate" title={name}>{name}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={clsx('tag text-[10px]', side === 'YES' ? 'tag-green' : side === 'NO' ? 'tag-red' : 'tag-gray')}>
                          {side}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-mono text-mc-muted">
                        {amount != null ? `$${Number(amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-mono text-mc-muted">
                        {entry != null ? `${(Number(entry) * 100).toFixed(1)}¢` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-mono text-mc-muted">
                        {exit != null ? `${(Number(exit) * 100).toFixed(1)}¢` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-mono">
                        {pnl != null ? (
                          <span className={Number(pnl) >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {fmt$(pnl)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <ResultBadge result={result} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, color, big, pnl }) {
  const colors = {
    green:  { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   iconC: 'text-green-400',  valC: 'text-green-300' },
    red:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   iconC: 'text-red-400',    valC: 'text-red-300' },
    amber:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  iconC: 'text-amber-400',  valC: 'text-amber-300' },
    blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  iconC: 'text-blue-400',   valC: 'text-blue-300' },
  }
  const c = colors[color] || colors.green

  return (
    <div className="rounded-lg p-4 border mc-hover" style={{ background: c.bg, borderColor: c.border }}>
      <div className={clsx('mb-2', c.iconC)}>{icon}</div>
      <div className={clsx('font-bold font-mono mb-0.5', c.valC, big ? 'text-2xl' : 'text-xl')}>
        {value}
      </div>
      <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide">{label}</div>
      <div className="text-[10px] text-mc-subtle mt-1">{sub}</div>
    </div>
  )
}

function ResultBadge({ result }) {
  const r = (result ?? '').toString().toLowerCase()
  if (r === 'won' || r === 'win' || r === 'success')
    return <span className="tag tag-green text-[10px]">✓ Gagné</span>
  if (r === 'lost' || r === 'loss' || r === 'fail' || r === 'failed')
    return <span className="tag tag-red text-[10px]">✗ Perdu</span>
  if (r === 'open' || r === 'running')
    return <span className="tag tag-amber text-[10px]">⊙ Ouvert</span>
  return <span className="tag tag-gray text-[10px]">{result || '?'}</span>
}

function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center mc-grid-bg">
      <div className="text-center">
        <RefreshCw size={32} className="text-amber-400 mx-auto mb-3 animate-spin" />
        <div className="text-mc-muted text-sm">Connexion à Alfred...</div>
        <div className="text-mc-subtle text-[11px] font-mono mt-1">GET /api/alfred</div>
      </div>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="h-full flex items-center justify-center mc-grid-bg">
      <div className="text-center max-w-md">
        <WifiOff size={36} className="text-red-400 mx-auto mb-3" />
        <div className="text-mc-text text-sm font-semibold mb-1">Impossible de contacter Alfred</div>
        <div className="text-red-300 text-[11px] font-mono bg-red-500/10 border border-red-500/20 rounded p-3 mb-3">
          {error}
        </div>
        <div className="text-mc-muted text-[11px]">
          Vérifie que le serveur tourne :<br />
          <code className="text-amber-300">npm run server</code>
        </div>
      </div>
    </div>
  )
}
