import React, { useEffect, useRef, useState } from 'react'

const STATUS_COLORS = {
  online:  { fill: '#22c55e', stroke: '#15803d', glow: 'rgba(34,197,94,0.5)' },
  busy:    { fill: '#f59e0b', stroke: '#b45309', glow: 'rgba(245,158,11,0.5)' },
  offline: { fill: '#475569', stroke: '#334155', glow: 'transparent' },
  error:   { fill: '#ef4444', stroke: '#b91c1c', glow: 'rgba(239,68,68,0.5)' },
}

export default function SystemMap({ agents, clawbotRunning }) {
  const [tick, setTick] = useState(0)
  const [activeParticles, setActiveParticles] = useState([])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50)
    return () => clearInterval(id)
  }, [])

  // Spawn particles on active connections
  useEffect(() => {
    if (!clawbotRunning) return
    const interval = setInterval(() => {
      const activeAgents = agents.filter(
        (a) => a.status === 'online' || a.status === 'busy'
      )
      if (activeAgents.length === 0) return
      const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)]
      setActiveParticles((prev) => [
        ...prev.filter((p) => Date.now() - p.born < 2000),
        { id: Date.now() + Math.random(), agentId: agent.id, born: Date.now(), progress: 0 },
      ])
    }, 600)
    return () => clearInterval(interval)
  }, [agents, clawbotRunning])

  // Animate particles
  useEffect(() => {
    setActiveParticles((prev) =>
      prev
        .map((p) => ({ ...p, progress: (Date.now() - p.born) / 2000 }))
        .filter((p) => p.progress < 1)
    )
  }, [tick])

  const W = 600
  const H = 230
  const cx = W / 2
  const cy = H / 2

  // Position agents in a circle
  const agentPositions = agents.map((agent, i) => {
    const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2
    const rx = W * 0.36
    const ry = H * 0.38
    return {
      ...agent,
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    }
  })

  const hubColor = clawbotRunning ? '#f59e0b' : '#475569'
  const hubGlow  = clawbotRunning ? 'rgba(245,158,11,0.4)' : 'transparent'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Hub glow filter */}
        <filter id="hub-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Agent glow filter */}
        <filter id="agent-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Radial gradient for hub */}
        <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={hubColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={hubColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background radial glow at hub */}
      <circle cx={cx} cy={cy} r={60} fill="url(#hubGrad)" />

      {/* Grid lines (subtle) */}
      {[-2, -1, 0, 1, 2].map((i) => (
        <line
          key={`h${i}`}
          x1={0} y1={cy + i * 40}
          x2={W} y2={cy + i * 40}
          stroke="#1a2744" strokeWidth="0.5" opacity="0.5"
        />
      ))}
      {[-6, -4, -2, 0, 2, 4, 6].map((i) => (
        <line
          key={`v${i}`}
          x1={cx + i * 50} y1={0}
          x2={cx + i * 50} y2={H}
          stroke="#1a2744" strokeWidth="0.5" opacity="0.5"
        />
      ))}

      {/* Connection lines from hub to agents */}
      {agentPositions.map((agent) => {
        const isActive = agent.status === 'online' || agent.status === 'busy'
        const sc = STATUS_COLORS[agent.status] || STATUS_COLORS.offline
        return (
          <g key={`line-${agent.id}`}>
            {/* Base line */}
            <line
              x1={cx} y1={cy}
              x2={agent.x} y2={agent.y}
              stroke={isActive ? sc.stroke : '#1a2744'}
              strokeWidth={isActive ? 1.5 : 0.8}
              strokeDasharray={isActive ? '6 3' : '3 5'}
              opacity={isActive ? 0.7 : 0.3}
            >
              {isActive && clawbotRunning && (
                <animate
                  attributeName="stroke-dashoffset"
                  from="0" to="-18"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              )}
            </line>
          </g>
        )
      })}

      {/* Particles on connections */}
      {activeParticles.map((particle) => {
        const agent = agentPositions.find((a) => a.id === particle.agentId)
        if (!agent) return null
        const sc = STATUS_COLORS[agent.status] || STATUS_COLORS.offline
        // Animate from agent to hub or hub to agent
        const fromHub = particle.progress < 0.5
        const t = fromHub ? particle.progress * 2 : (particle.progress - 0.5) * 2
        const px = fromHub
          ? cx + (agent.x - cx) * t
          : agent.x + (cx - agent.x) * t
        const py = fromHub
          ? cy + (agent.y - cy) * t
          : agent.y + (cy - agent.y) * t
        return (
          <circle
            key={particle.id}
            cx={px} cy={py} r={2.5}
            fill={sc.fill}
            opacity={1 - Math.abs(particle.progress - 0.5) * 1.5}
            filter="url(#agent-glow)"
          />
        )
      })}

      {/* Agent nodes */}
      {agentPositions.map((agent) => {
        const sc = STATUS_COLORS[agent.status] || STATUS_COLORS.offline
        const isActive = agent.status === 'online' || agent.status === 'busy'
        return (
          <g key={`agent-${agent.id}`}>
            {/* Outer ring glow */}
            {isActive && (
              <circle
                cx={agent.x} cy={agent.y} r={18}
                fill="none"
                stroke={sc.fill}
                strokeWidth="1"
                opacity="0.3"
              >
                <animate
                  attributeName="r" from="14" to="22"
                  dur="2s" repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity" from="0.4" to="0"
                  dur="2s" repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Node background */}
            <circle
              cx={agent.x} cy={agent.y} r={14}
              fill="#0e1528"
              stroke={sc.stroke}
              strokeWidth="1.5"
              filter={isActive ? 'url(#agent-glow)' : undefined}
            />

            {/* Inner fill */}
            <circle
              cx={agent.x} cy={agent.y} r={12}
              fill={sc.fill}
              opacity={isActive ? 0.25 : 0.1}
            />

            {/* Agent icon/emoji */}
            <text
              x={agent.x} y={agent.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fill={sc.fill}
              style={{ userSelect: 'none' }}
            >
              {agent.icon}
            </text>

            {/* Agent name label */}
            <text
              x={agent.x}
              y={agent.y + 22}
              textAnchor="middle"
              fontSize="8"
              fill="#94a3b8"
              fontFamily="Inter, sans-serif"
              style={{ userSelect: 'none' }}
            >
              {agent.name.split(' ')[0]}
            </text>

            {/* Status label */}
            <text
              x={agent.x}
              y={agent.y + 31}
              textAnchor="middle"
              fontSize="7"
              fill={sc.fill}
              fontFamily="JetBrains Mono, monospace"
              style={{ userSelect: 'none', textTransform: 'uppercase' }}
            >
              {agent.status}
            </text>
          </g>
        )
      })}

      {/* Hub (ClawBot) */}
      <g>
        {/* Outer pulsing ring */}
        {clawbotRunning && (
          <circle cx={cx} cy={cy} r={28} fill="none" stroke={hubColor} strokeWidth="1" opacity="0.3">
            <animate
              attributeName="r" from="22" to="34"
              dur="2.5s" repeatCount="indefinite"
            />
            <animate
              attributeName="opacity" from="0.4" to="0"
              dur="2.5s" repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Hub background */}
        <circle
          cx={cx} cy={cy} r={22}
          fill="#0e1528"
          stroke={hubColor}
          strokeWidth="2"
          filter="url(#hub-glow)"
        />

        {/* Hub inner */}
        <circle cx={cx} cy={cy} r={18} fill={hubColor} opacity="0.2" />

        {/* Hub icon */}
        <text
          x={cx} y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="18"
          fill={hubColor}
          style={{ userSelect: 'none' }}
        >
          ⚡
        </text>

        {/* Hub label */}
        <text
          x={cx} y={cy + 30}
          textAnchor="middle"
          fontSize="9"
          fill={hubColor}
          fontFamily="Inter, sans-serif"
          fontWeight="600"
          style={{ userSelect: 'none' }}
        >
          ClawBot Hub
        </text>
        <text
          x={cx} y={cy + 40}
          textAnchor="middle"
          fontSize="7"
          fill="#64748b"
          fontFamily="JetBrains Mono, monospace"
          style={{ userSelect: 'none' }}
        >
          {clawbotRunning ? 'ONLINE' : 'OFFLINE'}
        </text>
      </g>
    </svg>
  )
}
