import React, { useEffect, useState, useCallback } from 'react';

const styles = `
@keyframes typing {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 8px #22c55e88; }
  50% { box-shadow: 0 0 20px #22c55ecc; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
`;

function AgentCharacter({ status }) {
  const isRunning = status === 'running';
  return (
    <svg width="64" height="80" viewBox="0 0 64 80" style={isRunning ? { animation: 'typing 1s ease-in-out infinite' } : {}}>
      {/* Head */}
      <circle cx="32" cy="20" r="14" fill="#3B82F6" stroke="#60A5FA" strokeWidth="2" />
      {/* Eyes */}
      <circle cx="26" cy="18" r="2.5" fill={isRunning ? '#22c55e' : '#666'} />
      <circle cx="38" cy="18" r="2.5" fill={isRunning ? '#22c55e' : '#666'} />
      {/* Mouth */}
      <path d={isRunning ? 'M25 26 Q32 32 39 26' : 'M25 28 L39 28'} fill="none" stroke={isRunning ? '#22c55e' : '#666'} strokeWidth="2" />
      {/* Body */}
      <rect x="20" y="36" width="24" height="28" rx="4" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1.5" />
      {/* Arms */}
      <rect x="8" y="40" width="12" height="6" rx="3" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1" />
      <rect x="44" y="40" width="12" height="6" rx="3" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1" />
      {/* Gear icon on chest */}
      <text x="32" y="54" textAnchor="middle" fontSize="12">⚙️</text>
    </svg>
  );
}

function DeskScreen({ status }) {
  const isRunning = status === 'running';
  return (
    <div style={{
      width: 100, height: 60, borderRadius: 6, border: '2px solid #333',
      background: isRunning ? '#0a1a0a' : '#111',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...(isRunning ? { animation: 'glow 2s ease-in-out infinite' } : {}),
    }}>
      {isRunning ? (
        <div style={{ color: '#22c55e', fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
          <div style={{ animation: 'pulse 1.5s infinite' }}>TRADING</div>
          <div style={{ fontSize: 8, opacity: 0.7 }}>LIVE</div>
        </div>
      ) : (
        <div style={{ color: '#444', fontSize: 10 }}>OFF</div>
      )}
    </div>
  );
}

function LogPanel({ onClose }) {
  const [logs, setLogs] = useState([]);

  const fetchLogs = useCallback(() => {
    fetch('/api/alfred/logs')
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
    const iv = setInterval(fetchLogs, 5000);
    return () => clearInterval(iv);
  }, [fetchLogs]);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 480, height: '100vh',
      background: '#0d0d0d', borderLeft: '2px solid #3B82F6', zIndex: 100,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #222' }}>
        <span style={{ color: '#3B82F6', fontWeight: 'bold' }}>Alfred Logs</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 12, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
        {logs.length === 0 ? (
          <div style={{ color: '#555' }}>No logs available</div>
        ) : (
          logs.map((l, i) => <div key={i} style={{ color: l.includes('ERROR') ? '#ef4444' : l.includes('TRADE') ? '#22c55e' : '#aaa' }}>{l}</div>)
        )}
      </div>
    </div>
  );
}

export default function Workspace() {
  const [agents, setAgents] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(setAgents)
      .catch(() => {});
    const iv = setInterval(() => {
      fetch('/api/agents').then(r => r.json()).then(setAgents).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const alfred = agents.find(a => a.id === 'alfred-system') || { name: 'Alfred', status: 'offline' };
  const others = agents.filter(a => a.id !== 'alfred-system');
  const wr = alfred.totalTrades > 0 ? Math.round((alfred.wins / alfred.totalTrades) * 100) : 0;

  return (
    <div>
      <style>{styles}</style>
      <h2 style={{ marginBottom: 20, fontSize: '1rem', color: '#888' }}>Agent Desks</h2>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Alfred desk — always first */}
        <div
          onClick={() => setShowLogs(true)}
          style={{
            width: 220, padding: 20, borderRadius: 12,
            border: `2px solid ${alfred.status === 'running' ? '#22c55e' : '#333'}`,
            background: '#111', cursor: 'pointer', textAlign: 'center',
            transition: 'border-color 0.3s',
          }}
        >
          <AgentCharacter status={alfred.status} />
          <DeskScreen status={alfred.status} />
          <div style={{ marginTop: 12, fontWeight: 'bold', color: '#3B82F6' }}>
            ⚙️ {alfred.name}
          </div>
          <div style={{ fontSize: 11, color: '#888', margin: '4px 0' }}>{alfred.role || 'Trading Agent'}</div>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
            background: alfred.status === 'running' ? '#052e16' : '#1c0a0a',
            color: alfred.status === 'running' ? '#22c55e' : '#ef4444',
            border: `1px solid ${alfred.status === 'running' ? '#22c55e44' : '#ef444444'}`,
          }}>
            ● {alfred.status === 'running' ? 'RUNNING' : 'OFFLINE'}
          </span>
          {alfred.bank !== undefined && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
              Bank: {alfred.bank?.toFixed(2)}$ | P&L: {alfred.allTimePnl >= 0 ? '+' : ''}{alfred.allTimePnl?.toFixed(2)}$ | WR: {wr}%
            </div>
          )}
        </div>

        {/* Other agents */}
        {others.map(agent => (
          <div key={agent.id} style={{
            width: 220, padding: 20, borderRadius: 12,
            border: '2px solid #333', background: '#111', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{agent.icon || '🤖'}</div>
            <div style={{ fontWeight: 'bold', color: agent.color || '#888' }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{agent.role}</div>
          </div>
        ))}
      </div>

      {showLogs && <LogPanel onClose={() => setShowLogs(false)} />}
    </div>
  );
}
