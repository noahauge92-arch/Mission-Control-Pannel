import { create } from 'zustand'
import { initialSkills, initialLogs } from '../data/initialData'

export const useStore = create((set) => ({
  // ── Navigation ──────────────────────────────────────────────────────────
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  // ── Alfred live state (from /api/alfred) ─────────────────────────────────
  alfred: null,           // raw state.json content
  alfredAnalytics: null,  // raw analytics.json content
  alfredLogs: [],         // last 50 raw log lines (strings)
  alfredError: null,      // connection / parse error
  alfredLoading: true,    // first-load flag
  alfredLastUpdated: null,

  setAlfred: (data) =>
    set({ alfred: data, alfredLastUpdated: new Date(), alfredError: null, alfredLoading: false }),

  setAlfredAnalytics: (data) => set({ alfredAnalytics: data }),

  setAlfredLogs: (lines) =>
    set(() => {
      const parsed = lines.map((line, i) => parseLogLine(line, i))
      return { alfredLogs: lines, logs: parsed }
    }),

  setAlfredError: (err) => set({ alfredError: err, alfredLoading: false }),

  // ── Skills (ClaWHub) ──────────────────────────────────────────────────────
  skills: initialSkills,

  toggleSkill: (id) =>
    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === id ? { ...s, installed: !s.installed } : s
      ),
    })),

  addCustomSkill: (skill) =>
    set((state) => ({
      skills: [
        ...state.skills,
        {
          ...skill,
          id: `custom-${Date.now()}`,
          source: 'Custom',
          installed: true,
          rating: 5.0,
          version: 'v1.0.0',
        },
      ],
    })),

  // ── Logs (fed by setAlfredLogs + initial seed) ────────────────────────────
  logs: initialLogs,

  addLog: (log) =>
    set((state) => ({
      logs: [{ ...log, id: Date.now() + Math.random(), timestamp: new Date() }, ...state.logs].slice(0, 500),
    })),

  clearLogs: () => set({ logs: [] }),

  // ── Uptime (ticks every second) ───────────────────────────────────────────
  uptimeSeconds: 0,
  tickUptime: () => set((s) => ({ uptimeSeconds: s.uptimeSeconds + 1 })),
}))

// ── Log line parser ───────────────────────────────────────────────────────────
// Handles common Alfred log formats:
//   2026-03-07 10:30:00 INFO  [Alfred] message
//   2026-03-07 10:30:00,123 WARNING message
//   [10:30:00] INFO message
//   INFO: message  /  plain text

function parseLogLine(line, index) {
  const isoRe = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[,.]?\d*)\s+(INFO|WARNING|WARN|ERROR|SUCCESS|DEBUG|CRITICAL)\s*(?:\[.*?\])?\s*(.*)/i
  const m = line.match(isoRe)
  if (m) {
    return {
      id: index,
      agent: 'Alfred',
      agentId: null,
      level: normalizeLevel(m[2]),
      message: m[3] || line,
      timestamp: new Date(m[1].replace(',', '.').replace(' ', 'T')),
    }
  }

  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s+(INFO|WARNING|WARN|ERROR|SUCCESS|DEBUG)\s*(.*)/i
  const t = line.match(timeRe)
  if (t) {
    return {
      id: index,
      agent: 'Alfred',
      agentId: null,
      level: normalizeLevel(t[2]),
      message: t[3] || line,
      timestamp: new Date(),
    }
  }

  const levelRe = /^(INFO|WARNING|WARN|ERROR|SUCCESS|DEBUG|CRITICAL)[: ]\s*(.*)/i
  const l = line.match(levelRe)
  if (l) {
    return {
      id: index,
      agent: 'Alfred',
      agentId: null,
      level: normalizeLevel(l[1]),
      message: l[2] || line,
      timestamp: new Date(),
    }
  }

  return { id: index, agent: 'Alfred', agentId: null, level: 'info', message: line, timestamp: new Date() }
}

function normalizeLevel(raw = '') {
  const u = raw.toUpperCase()
  if (u === 'WARNING' || u === 'WARN' || u === 'CRITICAL') return 'warning'
  if (u === 'ERROR') return 'error'
  if (u === 'SUCCESS') return 'success'
  return 'info'
}
