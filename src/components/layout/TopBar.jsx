import React, { useState } from 'react'
import { AlertCircle, RefreshCw, Bell, Settings, Power, ShieldAlert } from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const REGIME_COLORS = {
  NORMAL:   'text-green-400',
  CAUTION:  'text-amber-400',
  CRITICAL: 'text-red-400',
  RECOVERY: 'text-blue-400',
}

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  skills:    'ClaWHub — Skills',
  logs:      'Logs Console',
}

export default function TopBar() {
  const alfred      = useStore((s) => s.alfred)
  const alfredError = useStore((s) => s.alfredError)
  const loading     = useStore((s) => s.alfredLoading)
  const lastUpdated = useStore((s) => s.alfredLastUpdated)
  const activeView  = useStore((s) => s.activeView)

  const regime = (alfred?.regime ?? alfred?.market_regime ?? '—').toString().toUpperCase()
  const bank   = alfred?.bank ?? alfred?.balance ?? alfred?.capital
  const pnlDay = alfred?.pnl_today ?? alfred?.daily_pnl ?? alfred?.pnl_24h
  const status = alfred?.status ?? alfred?.bot_status ?? 'unknown'

  const pad = (n) => String(n).padStart(2, '0')
  const fmtLast = (d) => {
    if (!d) return '—'
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  return (
    <header className="flex items-center h-12 px-4 border-b border-mc-border bg-mc-deep shrink-0 gap-3">
      {/* View title */}
      <span className="text-[11px] font-mono font-semibold tracking-widest uppercase text-amber-400">
        ⚡ {VIEW_LABELS[activeView] || activeView}
      </span>

      <div className="h-4 w-px bg-mc-border" />

      {/* Alfred status pills */}
      {loading ? (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-mc-panel border border-mc-border">
          <RefreshCw size={10} className="text-mc-muted animate-spin" />
          <span className="text-[10px] text-mc-muted font-mono">Connecting...</span>
        </div>
      ) : alfred ? (
        <>
          {/* Bot status */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-mc-panel border border-mc-border">
            <span className={clsx('w-1.5 h-1.5 rounded-full', status === 'running' || status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-mc-muted')} />
            <span className="text-[10px] font-mono text-mc-text">{status}</span>
          </div>

          {/* Regime */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-mc-panel border border-mc-border">
            <ShieldAlert size={10} className={REGIME_COLORS[regime] || 'text-mc-muted'} />
            <span className={clsx('text-[10px] font-mono font-bold', REGIME_COLORS[regime] || 'text-mc-muted')}>
              {regime}
            </span>
          </div>

          {/* Bank */}
          {bank != null && (
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-mc-muted">Bank</span>
              <span className="text-green-300 font-semibold">
                ${Number(bank).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* P&L today */}
          {pnlDay != null && (
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-mc-muted">P&L</span>
              <span className={Number(pnlDay) >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                {Number(pnlDay) >= 0 ? '+' : ''}{Number(pnlDay).toFixed(2)}$
              </span>
            </div>
          )}
        </>
      ) : null}

      {/* Error indicator */}
      {alfredError && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
          <AlertCircle size={10} className="text-red-400" />
          <span className="text-[10px] text-red-400 font-mono">Server offline</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Last sync */}
      {lastUpdated && (
        <div className="text-[10px] font-mono text-mc-subtle">
          sync <span className="text-mc-muted">{fmtLast(lastUpdated)}</span>
        </div>
      )}

      <LiveClock />

      <div className="h-4 w-px bg-mc-border" />

      <button className="btn-ghost" title="Notifications">
        <Bell size={14} />
      </button>
      <button className="btn-ghost" title="Settings">
        <Settings size={14} />
      </button>
    </header>
  )
}

function LiveClock() {
  const [time, setTime] = React.useState(new Date())
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className="text-[11px] font-mono text-mc-muted">
      {time.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
      {' '}
      <span className="text-mc-text font-semibold">
        {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
      </span>
    </div>
  )
}
