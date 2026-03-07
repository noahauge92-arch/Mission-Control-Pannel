import { create } from 'zustand'
import {
  initialAgents,
  initialTasks,
  initialSkills,
  initialLogs,
  initialMemories,
} from '../data/initialData'

export const useStore = create((set, get) => ({
  // ── System ──────────────────────────────────────────────────────────────
  systemStatus: 'online', // 'online' | 'offline' | 'maintenance'
  clawbotRunning: true,
  uptimeSeconds: 0,
  activeView: 'dashboard',

  setActiveView: (view) => set({ activeView: view }),

  toggleSystem: () =>
    set((state) => ({
      clawbotRunning: !state.clawbotRunning,
      systemStatus: state.clawbotRunning ? 'offline' : 'online',
    })),

  tickUptime: () => set((state) => ({ uptimeSeconds: state.uptimeSeconds + 1 })),

  // ── Agents ───────────────────────────────────────────────────────────────
  agents: initialAgents,

  addAgent: (agent) =>
    set((state) => ({
      agents: [
        ...state.agents,
        {
          ...agent,
          id: Date.now(),
          tasksCompleted: 0,
          uptime: '0h 0m',
          lastActive: new Date(),
          cpu: 0,
          memory: Math.floor(Math.random() * 20) + 5,
        },
      ],
    })),

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAgent: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),

  toggleAgentStatus: (id) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === 'online' ? 'offline' : 'online',
              cpu: a.status === 'online' ? 0 : Math.floor(Math.random() * 30) + 10,
              currentTask: a.status === 'online' ? null : a.currentTask,
            }
          : a
      ),
    })),

  // Simulate slight metric drift
  tickAgentMetrics: () =>
    set((state) => ({
      agents: state.agents.map((a) => {
        if (a.status !== 'online' && a.status !== 'busy') return a
        const deltaCpu = (Math.random() - 0.5) * 8
        const deltaMem = (Math.random() - 0.5) * 4
        return {
          ...a,
          cpu: Math.min(100, Math.max(0, a.cpu + deltaCpu)),
          memory: Math.min(100, Math.max(0, a.memory + deltaMem)),
        }
      }),
    })),

  // ── Tasks ────────────────────────────────────────────────────────────────
  tasks: initialTasks,

  addTask: (task) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          ...task,
          id: Date.now(),
          status: 'pending',
          progress: 0,
          createdAt: new Date(),
          steps: task.steps || [],
          logs: [],
        },
      ],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  retryTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'pending',
              progress: 0,
              steps: t.steps.map((s) => ({
                ...s,
                status: s.status === 'failed' ? 'pending' : s.status,
              })),
              logs: [
                ...t.logs,
                { time: new Date(), msg: 'Task queued for retry by operator' },
              ],
            }
          : t
      ),
    })),

  // ── Skills ───────────────────────────────────────────────────────────────
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

  updateSkillParams: (id, params) =>
    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === id ? { ...s, params: { ...s.params, ...params } } : s
      ),
    })),

  // ── Logs ─────────────────────────────────────────────────────────────────
  logs: initialLogs,

  addLog: (log) =>
    set((state) => ({
      logs: [
        { ...log, id: Date.now() + Math.random(), timestamp: new Date() },
        ...state.logs,
      ].slice(0, 1000),
    })),

  clearLogs: () => set({ logs: [] }),

  // ── Memory ───────────────────────────────────────────────────────────────
  memories: initialMemories,

  addMemory: (memory) =>
    set((state) => ({
      memories: [
        ...state.memories,
        { ...memory, id: Date.now(), createdAt: new Date() },
      ],
    })),

  updateMemory: (id, updates) =>
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  deleteMemory: (id) =>
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    })),

  // ── Resource history for charts ──────────────────────────────────────────
  resourceHistory: Array.from({ length: 20 }, (_, i) => ({
    t: i,
    cpu: Math.floor(Math.random() * 40) + 20,
    mem: Math.floor(Math.random() * 30) + 45,
    net: Math.floor(Math.random() * 60) + 10,
  })),

  tickResourceHistory: () =>
    set((state) => {
      const last = state.resourceHistory[state.resourceHistory.length - 1]
      const newPoint = {
        t: last.t + 1,
        cpu: Math.min(100, Math.max(0, last.cpu + (Math.random() - 0.5) * 12)),
        mem: Math.min(100, Math.max(0, last.mem + (Math.random() - 0.5) * 6)),
        net: Math.min(100, Math.max(0, last.net + (Math.random() - 0.5) * 20)),
      }
      return {
        resourceHistory: [...state.resourceHistory.slice(-39), newPoint],
      }
    }),
}))
