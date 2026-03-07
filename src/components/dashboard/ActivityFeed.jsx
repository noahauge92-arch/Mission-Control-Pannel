import React from 'react'
import clsx from 'clsx'

const LEVEL_STYLES = {
  info:    { dot: 'bg-blue-400',   text: 'text-blue-300',   badge: 'tag-blue' },
  success: { dot: 'bg-green-400',  text: 'text-green-300',  badge: 'tag-green' },
  warning: { dot: 'bg-amber-400',  text: 'text-amber-300',  badge: 'tag-amber' },
  error:   { dot: 'bg-red-400',    text: 'text-red-300',    badge: 'tag-red' },
}

function fmtTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function ActivityFeed({ logs, agents }) {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]))

  return (
    <div className="p-2 space-y-0.5">
      {logs.slice(0, 30).map((log) => {
        const s = LEVEL_STYLES[log.level] || LEVEL_STYLES.info
        const agent = log.agentId ? agentMap[log.agentId] : null

        return (
          <div
            key={log.id}
            className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-mc-panel/50 transition-colors"
          >
            {/* Time */}
            <span className="text-[9px] font-mono text-mc-subtle shrink-0 mt-0.5 w-14">
              {fmtTime(log.timestamp)}
            </span>

            {/* Level dot */}
            <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', s.dot)} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {agent && (
                  <span className="text-[10px] font-semibold" style={{ color: agent.color }}>
                    {agent.name.split(' ')[0]}
                  </span>
                )}
                {!agent && log.agent && (
                  <span className="text-[10px] font-semibold text-amber-400">{log.agent}</span>
                )}
                <span className={clsx('tag text-[9px] px-1 py-0', s.badge)}>{log.level}</span>
              </div>
              <div className="text-[10px] text-mc-muted leading-snug">{log.message}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
