import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RefreshCw, MessageSquare } from 'lucide-react'

// ── Agent registry ────────────────────────────────────────────────────────────

const GROUP_AGENT = {
  id: 'group', name: 'Discussion Groupe', role: 'Le Patron coordonne tous les agents',
  icon: '💬', color: '#a855f7',
  badge: 'Multi-Agent', badgeColor: 'rgba(168,85,247,0.12)', badgeBorder: 'rgba(168,85,247,0.35)', badgeText: '#a855f7',
}

const SYSTEM_AGENTS = [
  {
    id: 'boss', name: 'Baby Boss', role: 'Chef de Projet', icon: '👑', color: '#f59e0b',
    badge: 'DeepSeek', badgeColor: 'rgba(245,158,11,0.15)', badgeBorder: 'rgba(245,158,11,0.35)', badgeText: '#f59e0b',
  },
  {
    id: 'alfred', name: 'Alfred', role: 'Trading Agent — Polymarket', icon: '⚙️', color: '#22c55e',
    badge: 'local', badgeColor: 'rgba(34,197,94,0.1)', badgeBorder: 'rgba(34,197,94,0.3)', badgeText: '#22c55e',
  },
  {
    id: 'balthazar', name: 'Balthazar', role: 'Scraping & Coding', icon: '📰', color: '#3b82f6',
    badge: 'local', badgeColor: 'rgba(59,130,246,0.1)', badgeBorder: 'rgba(59,130,246,0.3)', badgeText: '#3b82f6',
  },
]

// ── TypingIndicator ───────────────────────────────────────────────────────────
function TypingIndicator({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: color,
          animation: `chat-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────
// groupAgent = { id, name, icon, color } for group-mode messages
function Bubble({ role, content, agentColor, agentIcon, ts, groupAgent }) {
  const isUser       = role === 'user'
  const displayColor = groupAgent?.color ?? agentColor
  const displayIcon  = groupAgent?.icon  ?? agentIcon

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Agent name label (group mode only) */}
      {!isUser && groupAgent?.name && (
        <div style={{
          fontFamily: 'monospace', fontSize: 9, color: displayColor,
          marginBottom: 3, paddingLeft: 36,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {groupAgent.name}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
        {/* Avatar */}
        {!isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: 4, flexShrink: 0,
            background: `${displayColor}22`, border: `1.5px solid ${displayColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 2,
          }}>
            {displayIcon}
          </div>
        )}
        {/* Content */}
        <div style={{
          maxWidth: '72%',
          background: isUser
            ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(180,100,0,0.22))'
            : 'rgba(255,255,255,0.04)',
          border: isUser
            ? '1px solid rgba(245,158,11,0.3)'
            : `1px solid ${displayColor}20`,
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          padding: '10px 14px',
        }}>
          <div style={{
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6,
            color: isUser ? '#f5c886' : '#c8d8e8',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {content}
          </div>
          {ts && (
            <div style={{
              fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)',
              marginTop: 4, textAlign: isUser ? 'left' : 'right',
            }}>
              {new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AgentListItem ─────────────────────────────────────────────────────────────
function AgentListItem({ agent, active, onClick, processStatus }) {
  const isRunning = agent.id === 'alfred'
    ? processStatus?.alfred
    : agent.id === 'balthazar'
    ? processStatus?.balthazar
    : null

  const dotColor = isRunning === true ? '#22c55e' : isRunning === false ? '#ef4444' : null

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: active ? `${agent.color}10` : 'none',
        border: 'none', cursor: 'pointer', padding: '10px 14px',
        borderLeft: active ? `3px solid ${agent.color}` : '3px solid transparent',
        transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 6, flexShrink: 0,
        background: `${agent.color}18`, border: `1.5px solid ${agent.color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {agent.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
            color: active ? agent.color : '#c8d8e8',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {agent.name}
          </span>
          {dotColor && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 4px ${dotColor}` }} />
          )}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a6080', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.role}
        </div>
        {agent.badge && (
          <div style={{
            display: 'inline-block', marginTop: 3,
            fontFamily: 'monospace', fontSize: 8, padding: '1px 5px',
            background: agent.badgeColor, border: `1px solid ${agent.badgeBorder}`,
            color: agent.badgeText, letterSpacing: '0.06em',
          }}>
            {agent.badge}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatCenter() {
  const [customAgents, setCustomAgents]   = useState([])
  const [processStatus, setProcessStatus] = useState({})
  const [activeAgentId, setActiveAgentId] = useState('group')
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [typing, setTyping]               = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState({})
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Full agent list (group at top)
  const allAgents = [
    GROUP_AGENT,
    ...SYSTEM_AGENTS,
    ...customAgents.map((a) => ({
      id: a.id, name: a.name, role: a.role || 'Custom Agent',
      icon: '🤖', color: a.color || '#a855f7',
      badge: 'DeepSeek', badgeColor: 'rgba(168,85,247,0.1)', badgeBorder: 'rgba(168,85,247,0.3)', badgeText: '#a855f7',
    })),
  ]

  const activeAgent = allAgents.find((a) => a.id === activeAgentId) ?? allAgents[0]

  // Inject CSS once
  useEffect(() => {
    const id = 'chat-animations'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes chat-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-5px); opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }, [])

  // Load custom agents + poll process status
  useEffect(() => {
    const init = async () => {
      try {
        const [agentsRes, statusRes] = await Promise.all([
          fetch('/api/agents'),
          fetch('/api/agents/status').catch(() => null),
        ])
        if (agentsRes.ok) setCustomAgents(await agentsRes.json())
        if (statusRes?.ok) setProcessStatus(await statusRes.json())
      } catch {}
    }
    init()
    const interval = setInterval(async () => {
      try { const r = await fetch('/api/agents/status'); if (r.ok) setProcessStatus(await r.json()) } catch {}
    }, 10_000)
    return () => clearInterval(interval)
  }, [])

  // Load history when switching agents
  useEffect(() => {
    if (historyLoaded[activeAgentId]) return
    const load = async () => {
      try {
        const r = await fetch(`/api/chat/${activeAgentId}/history`)
        if (!r.ok) return
        const hist = await r.json()
        if (!hist.length) return
        setMessages((prev) => {
          if (prev.some((m) => m.agentId === activeAgentId)) return prev
          return [
            ...prev,
            ...hist.map((m) => {
              // Group history: assistant messages have agentId/agentName/agentIcon/agentColor
              if (activeAgentId === 'group' && m.role === 'assistant' && m.agentName) {
                return {
                  ...m,
                  agentId: 'group',
                  groupAgent: { id: m.agentId ?? 'boss', name: m.agentName, icon: m.agentIcon ?? '🤖', color: m.agentColor ?? '#a855f7' },
                }
              }
              return { ...m, agentId: activeAgentId }
            }),
          ]
        })
        setHistoryLoaded((h) => ({ ...h, [activeAgentId]: true }))
      } catch {}
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentId])

  // Auto-scroll + focus
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])
  useEffect(() => { inputRef.current?.focus() }, [activeAgentId])

  const visibleMessages = messages.filter((m) => m.agentId === activeAgentId)
  const buildHistory    = () => visibleMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }))

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || typing) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text, agentId: activeAgentId, ts: Date.now() }])
    setTyping(true)

    try {
      if (activeAgentId === 'group') {
        // ── Group mode: Le Patron coordinates all agents ──────────────────
        const r = await fetch('/api/chat/group', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ message: text, history: buildHistory() }),
        })
        const { messages: groupMsgs = [] } = await r.json()
        setMessages((prev) => [
          ...prev,
          ...groupMsgs.map((m) => ({
            role: 'assistant', content: m.content, agentId: 'group', ts: m.ts ?? Date.now(),
            groupAgent: { id: m.id, name: m.name, icon: m.icon, color: m.color },
          })),
        ])
      } else {
        // ── Solo mode: direct agent chat ──────────────────────────────────
        const r = await fetch('/api/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ agentId: activeAgentId, message: text, history: buildHistory() }),
        })
        const { reply } = await r.json()
        setMessages((m) => [...m, { role: 'assistant', content: reply, agentId: activeAgentId, ts: Date.now() }])
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Erreur: ${e.message}`, agentId: activeAgentId, ts: Date.now() }])
    } finally {
      setTyping(false)
    }
  }, [input, typing, activeAgentId, messages])

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const clearChat = () => {
    setMessages((m) => m.filter((msg) => msg.agentId !== activeAgentId))
    setHistoryLoaded((h) => ({ ...h, [activeAgentId]: false }))
  }

  const welcomeHints = {
    group:     ['quel est le statut de tout le monde ?', 'résumé complet de la situation', 'qu\'est-ce qu\'on fait aujourd\'hui ?'],
    boss:      ['résumé de la situation', 'quelles tâches en cours ?', 'analyse le P&L d\'Alfred'],
    alfred:    ['pnl', 'status', 'positions', 'logs'],
    balthazar: ['news', 'status', 'logs'],
  }

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', background: '#080b12' }}>

      {/* ── Left: Agent list ── */}
      <div style={{
        width: 250, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: '#060810',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={14} color="#f59e0b" />
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Chat Agents
            </span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#2a3a50', marginTop: 4 }}>
            Groupe / Boss / Custom : DeepSeek · Alfred / Balthazar : local
          </div>
        </div>

        {/* Agent list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Group tab — always at top */}
          <div style={{ padding: '6px 0 0' }}>
            <AgentListItem agent={GROUP_AGENT} active={activeAgentId === 'group'} onClick={() => setActiveAgentId('group')} processStatus={processStatus} />
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 14px' }} />

          {/* System agents */}
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#2a3a50', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 14px 4px' }}>
            Système
          </div>
          {SYSTEM_AGENTS.map((a) => (
            <AgentListItem key={a.id} agent={a} active={activeAgentId === a.id} onClick={() => setActiveAgentId(a.id)} processStatus={processStatus} />
          ))}

          {/* Custom agents (Hugo etc.) */}
          {customAgents.length > 0 && (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#2a3a50', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 14px 4px' }}>
                Agents Custom
              </div>
              {customAgents.map((a) => {
                const agent = allAgents.find((ag) => ag.id === a.id)
                return agent
                  ? <AgentListItem key={a.id} agent={agent} active={activeAgentId === a.id} onClick={() => setActiveAgentId(a.id)} processStatus={processStatus} />
                  : null
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Center: Conversation ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Chat header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: 'rgba(255,255,255,0.01)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: `${activeAgent.color}18`, border: `1.5px solid ${activeAgent.color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {activeAgent.icon}
            </div>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: activeAgent.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {activeAgent.name}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a6080', marginTop: 1 }}>
                {activeAgent.role}
              </div>
            </div>
          </div>
          <button onClick={clearChat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a3a50', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 10 }} title="Effacer l'historique local">
            <RefreshCw size={11} /> Effacer
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px' }}>
          {visibleMessages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
              <div style={{ fontSize: 48, opacity: 0.4 }}>{activeAgent.icon}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#2a4060', textAlign: 'center', lineHeight: 1.8 }}>
                {activeAgentId === 'group'
                  ? <>Parle à <span style={{ color: '#a855f7' }}>toute l&apos;équipe</span> — Le Patron distribue aux agents</>
                  : <>Parle à <span style={{ color: activeAgent.color }}>{activeAgent.name}</span></>
                }
              </div>
              {(welcomeHints[activeAgentId] || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 420 }}>
                  {(welcomeHints[activeAgentId] || []).map((hint) => (
                    <button
                      key={hint}
                      onClick={() => { setInput(hint); inputRef.current?.focus() }}
                      style={{
                        fontFamily: 'monospace', fontSize: 10, padding: '5px 10px',
                        background: `${activeAgent.color}12`, border: `1px solid ${activeAgent.color}30`,
                        color: activeAgent.color, cursor: 'pointer',
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {visibleMessages.map((m, i) => (
                <Bubble
                  key={i}
                  role={m.role}
                  content={m.content}
                  agentColor={activeAgent.color}
                  agentIcon={activeAgent.icon}
                  ts={m.ts}
                  groupAgent={m.groupAgent}
                />
              ))}
              {typing && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: `${activeAgent.color}22`, border: `1.5px solid ${activeAgent.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    {activeAgent.icon}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px 12px 12px 2px' }}>
                    <TypingIndicator color={activeAgent.color} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgentId === 'group'
                ? 'Message à toute l\'équipe… Le Patron coordonne et distribue les réponses'
                : `Message ${activeAgent.name}… (Entrée pour envoyer, Shift+Entrée = nouvelle ligne)`
            }
            rows={1}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${input ? activeAgent.color + '40' : 'rgba(255,255,255,0.08)'}`,
              color: '#c8d8e8', fontFamily: 'monospace', fontSize: 12,
              padding: '10px 14px', resize: 'none', outline: 'none',
              lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              transition: 'border-color 0.15s',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || typing}
            style={{
              width: 40, height: 40, flexShrink: 0,
              background: input.trim() && !typing ? `${activeAgent.color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${input.trim() && !typing ? activeAgent.color + '50' : 'rgba(255,255,255,0.08)'}`,
              color: input.trim() && !typing ? activeAgent.color : '#2a3a50',
              cursor: input.trim() && !typing ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {typing ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
