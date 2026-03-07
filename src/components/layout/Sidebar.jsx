import React from 'react'
import { LayoutDashboard, Zap, ScrollText, ChevronRight, Monitor } from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'workspace', label: 'Workspace',       icon: Monitor },
  { id: 'logs',      label: 'Logs Alfred',     icon: ScrollText },
  { id: 'skills',    label: 'Skills',          icon: Zap },
]

export default function Sidebar() {
  const activeView    = useStore((s) => s.activeView)
  const setActiveView = useStore((s) => s.setActiveView)
  const alfred        = useStore((s) => s.alfred)
  const alfredError   = useStore((s) => s.alfredError)
  const loading       = useStore((s) => s.alfredLoading)
  const uptimeSeconds = useStore((s) => s.uptimeSeconds)
  const logs          = useStore((s) => s.logs)

  const errLogs = logs.filter((l) => l.level === 'error').length
  const regime  = (alfred?.regime ?? alfred?.market_regime ?? '—').toString().toUpperCase()
  const bank    = alfred?.bank ?? alfred?.balance ?? alfred?.capital
  const openPos = (alfred?.open_positions ?? alfred?.positions ?? []).length

  const fmtUptime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const REGIME_COLORS = { NORMAL: 'text-green-400', CAUTION: 'text-amber-400', CRITICAL: 'text-red-400', RECOVERY: 'text-blue-400' }

  return (
    <aside className="flex flex-col w-[200px] shrink-0 h-full border-r border-mc-border bg-mc-deep">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-mc-border">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-base">⚡</div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-mc-text leading-tight">Mission Control</div>
          <div className="text-[10px] text-amber-400 font-mono leading-tight">Alfred · Polymarket</div>
        </div>
      </div>

      {/* Alfred mini status */}
      <div className="mx-3 my-2.5 rounded-md bg-mc-panel border border-mc-border p-2.5">
        {loading ? (
          <div className="text-[10px] text-mc-muted font-mono animate-pulse">Connexion...</div>
        ) : alfredError && !alfred ? (
          <div className="text-[10px] text-red-400 font-mono">⚠ Server offline</div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="status-dot online" />
              <span className="text-[11px] font-semibold text-mc-text">ALFRED LIVE</span>
            </div>
            {bank != null && (
              <div className="text-[11px] font-mono text-green-300 font-semibold">
                ${Number(bank).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className={clsx('text-[10px] font-mono font-semibold', REGIME_COLORS[regime] || 'text-mc-muted')}>{regime}</span>
              <span className="text-[10px] text-mc-muted">{openPos} pos</span>
            </div>
            <div className="text-[9px] text-mc-subtle font-mono mt-0.5">UP {fmtUptime(uptimeSeconds)}</div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const badge = item.id === 'logs' && errLogs > 0 ? errLogs : null
          return (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all mb-0.5 group',
                isActive ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-mc-muted hover:text-mc-text hover:bg-mc-panel')}>
              <Icon size={14} className={clsx('shrink-0', isActive ? 'text-amber-400' : 'text-mc-muted group-hover:text-mc-text')} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {badge !== null && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">{badge}</span>}
              {isActive && <ChevronRight size={10} className="text-amber-400 shrink-0" />}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-mc-border">
        <div className="text-[10px] text-mc-subtle font-mono">Alfred Mission Control</div>
        <div className="text-[9px] text-mc-subtle font-mono mt-0.5">~/.openclaw/alfred/</div>
      </div>
    </aside>
  )
}
