import React, { useState, useRef, useEffect } from 'react'
import {
  ScrollText, Trash2, Download, Filter, Search,
  ChevronDown, Circle, Activity,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import clsx from 'clsx'

const LEVEL_CONFIG = {
  info:    { color: '#94a3b8', dot: '#3b82f6',  badge: 'tag-blue',   prefix: '[INFO ]' },
  success: { color: '#22c55e', dot: '#22c55e',  badge: 'tag-green',  prefix: '[OK   ]' },
  warning: { color: '#f59e0b', dot: '#f59e0b',  badge: 'tag-amber',  prefix: '[WARN ]' },
  error:   { color: '#ef4444', dot: '#ef4444',  badge: 'tag-red',    prefix: '[ERROR]' },
}

function padTime(d) {
  const date = d instanceof Date ? d : new Date(d)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

export default function LogsConsole() {
  const logs = useStore((s) => s.logs)
  const agents = useStore((s) => s.agents)
  const clearLogs = useStore((s) => s.clearLogs)

  const [levelFilter, setLevelFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]))

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80
    setAutoScroll(nearBottom)
  }

  const filtered = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false
    if (agentFilter !== 'all') {
      if (agentFilter === 'system' && log.agentId !== null) return false
      if (agentFilter !== 'system' && log.agentId !== Number(agentFilter)) return false
    }
    if (query) {
      const q = query.toLowerCase()
      return log.message.toLowerCase().includes(q) || log.agent?.toLowerCase().includes(q)
    }
    return true
  })

  const levelCounts = {
    all:     logs.length,
    info:    logs.filter((l) => l.level === 'info').length,
    success: logs.filter((l) => l.level === 'success').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    error:   logs.filter((l) => l.level === 'error').length,
  }

  const handleExport = () => {
    const content = filtered
      .map((l) => `[${new Date(l.timestamp).toISOString()}] ${LEVEL_CONFIG[l.level]?.prefix || '[LOG  ]'} [${l.agent}] ${l.message}`)
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clawbot-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-mc-bg font-mono">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-mc-border shrink-0 bg-mc-deep">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-amber-400" />
          <span className="text-[13px] font-semibold text-mc-text font-sans">Logs Console</span>
          <span className="tag tag-gray text-[10px]">{logs.length} entries</span>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
          <Activity size={10} className="text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-sans">LIVE</span>
        </div>

        {/* Search */}
        <div className="relative ml-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mc-muted" />
          <input
            className="mc-input pl-7 h-7 text-[11px] w-56 font-mono"
            placeholder="grep message..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-0.5 bg-mc-panel border border-mc-border rounded p-0.5">
          {['all', 'info', 'success', 'warning', 'error'].map((level) => {
            const lc = LEVEL_CONFIG[level]
            return (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                  levelFilter === level
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-mc-muted hover:text-mc-text'
                )}
                style={levelFilter === level && lc ? { color: lc.color } : {}}
              >
                {level === 'all' ? `All (${levelCounts.all})` : `${level} (${levelCounts[level]})`}
              </button>
            )
          })}
        </div>

        {/* Agent filter */}
        <select
          className="mc-select h-7 text-[11px] w-36"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
        >
          <option value="all">All Agents</option>
          <option value="system">System</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll((p) => !p)}
          className={clsx(
            'flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-all font-sans',
            autoScroll
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-mc-panel border-mc-border text-mc-muted'
          )}
        >
          <ChevronDown size={10} />
          Auto-scroll
        </button>

        {/* Export */}
        <button className="btn-ghost font-sans text-[11px]" onClick={handleExport}>
          <Download size={12} />
          Export
        </button>

        {/* Clear */}
        <button className="btn-danger text-[11px] font-sans" onClick={clearLogs}>
          <Trash2 size={11} />
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-0"
        style={{ background: '#060810' }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ScrollText size={36} className="text-mc-border mx-auto mb-3" />
              <div className="text-mc-muted text-sm font-sans">No log entries match your filters</div>
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {[...filtered].reverse().map((log, i) => {
                const lc = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
                const agent = log.agentId ? agentMap[log.agentId] : null
                const isEven = i % 2 === 0

                return (
                  <tr
                    key={log.id}
                    className="border-b hover:bg-mc-panel/30 transition-colors"
                    style={{ borderColor: '#0d111e', background: isEven ? 'transparent' : 'rgba(13,17,40,0.3)' }}
                  >
                    {/* Timestamp */}
                    <td className="px-3 py-1.5 text-[10px] text-mc-subtle whitespace-nowrap w-32 select-all">
                      {padTime(log.timestamp)}
                    </td>

                    {/* Level */}
                    <td className="px-2 py-1.5 w-20 whitespace-nowrap">
                      <span
                        className="text-[10px] font-bold tracking-wide"
                        style={{ color: lc.color }}
                      >
                        {lc.prefix}
                      </span>
                    </td>

                    {/* Agent */}
                    <td className="px-2 py-1.5 w-36 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {agent && <span className="text-[10px]">{agent.icon}</span>}
                        <span className="text-[10px] truncate" style={{ color: agent?.color || '#f59e0b' }}>
                          {log.agent || 'System'}
                        </span>
                      </div>
                    </td>

                    {/* Message */}
                    <td className="px-3 py-1.5 text-[11px] leading-relaxed" style={{ color: lc.color }}>
                      {log.message}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-mc-border bg-mc-deep shrink-0">
        <span className="text-[10px] text-mc-subtle">
          Showing {filtered.length}/{logs.length} entries
        </span>
        {levelFilter !== 'all' && (
          <span className="text-[10px]" style={{ color: LEVEL_CONFIG[levelFilter]?.color }}>
            Filter: {levelFilter}
          </span>
        )}
        {query && (
          <span className="text-[10px] text-mc-muted">grep: "{query}"</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Circle
            size={7}
            className={clsx(autoScroll ? 'text-green-400' : 'text-mc-subtle')}
            fill="currentColor"
          />
          <span className="text-[9px] text-mc-subtle">
            {autoScroll ? 'auto-scroll on' : 'auto-scroll off'}
          </span>
        </div>
      </div>
    </div>
  )
}
