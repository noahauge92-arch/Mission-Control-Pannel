/**
 * Alfred Mission Control — API Server
 * Expose ~/.openclaw/alfred/ files as JSON endpoints for the React dashboard.
 *
 * Start: npm run server   (port 3001)
 */

import express from 'express'
import cors from 'cors'
import { existsSync, readFileSync, createReadStream, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import readline from 'readline'
import multer from 'multer'
import AdmZip from 'adm-zip'
import { execSync } from 'child_process'
import crypto from 'crypto'

const app = express()
const PORT = 3001
const ALFRED_DIR  = join(homedir(), '.openclaw', 'alfred')
const SKILLS_DIR  = join(homedir(), '.openclaw', 'skills')
const AGENTS_FILE = join(ALFRED_DIR, 'agents.json')
const BOSS_FILE   = join(ALFRED_DIR, 'boss.json')
const TASKS_FILE  = join(ALFRED_DIR, 'tasks.json')

app.use(cors())
app.use(express.json())

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
})

// ── helpers ───────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  if (!existsSync(filePath)) return { _error: `File not found: ${filePath}` }
  try { return JSON.parse(readFileSync(filePath, 'utf-8')) }
  catch (err) { return { _error: `Parse error: ${err.message}` } }
}

async function tailFile(filePath, n = 50) {
  if (!existsSync(filePath)) return []
  return new Promise((resolve, reject) => {
    const lines = []
    const rl = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
    rl.on('line', (line) => { if (line.trim()) lines.push(line) })
    rl.on('close', () => resolve(lines.slice(-n)))
    rl.on('error', reject)
  })
}

function readAgents() {
  if (!existsSync(AGENTS_FILE)) return []
  try { return JSON.parse(readFileSync(AGENTS_FILE, 'utf-8')) }
  catch { return [] }
}

function saveAgents(agents) {
  mkdirSync(ALFRED_DIR, { recursive: true })
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
}

function readBoss() {
  if (!existsSync(BOSS_FILE)) return { currentObjective: '', assignments: [], updatedAt: null }
  try { return JSON.parse(readFileSync(BOSS_FILE, 'utf-8')) }
  catch { return { currentObjective: '', assignments: [], updatedAt: null } }
}

function saveBoss(data) {
  mkdirSync(ALFRED_DIR, { recursive: true })
  writeFileSync(BOSS_FILE, JSON.stringify(data, null, 2))
}

function readTasks() {
  if (!existsSync(TASKS_FILE)) return []
  try { return JSON.parse(readFileSync(TASKS_FILE, 'utf-8')) }
  catch { return [] }
}

function saveTasks(tasks) {
  mkdirSync(ALFRED_DIR, { recursive: true })
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

function isProcessRunning(scriptName) {
  try {
    execSync(`pgrep -f "${scriptName}"`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// ── Real agent status (pgrep) ─────────────────────────────────────────────────

app.get('/api/agents/status', (_req, res) => {
  res.json({
    alfred:    isProcessRunning('alfred-polymarket.mjs'),
    balthazar: isProcessRunning('balthazar.mjs'),
  })
})

// ── Alfred state routes ───────────────────────────────────────────────────────

app.get('/api/alfred', (_req, res) => {
  res.json(readJSON(join(ALFRED_DIR, 'state.json')))
})

app.get('/api/alfred/analytics', (_req, res) => {
  res.json(readJSON(join(ALFRED_DIR, 'analytics.json')))
})

app.get('/api/alfred/logs', async (_req, res) => {
  try {
    const lines = await tailFile('/tmp/alfred-v8.log', 80)
    if (lines.length === 0) {
      // Fallback to alfred dir log
      const fallback = await tailFile(join(ALFRED_DIR, 'alfred.log'), 80)
      return res.json({ lines: fallback })
    }
    res.json({ lines })
  } catch (err) {
    res.status(500).json({ lines: [], _error: err.message })
  }
})

// ── Balthazar logs ────────────────────────────────────────────────────────────

app.get('/api/balthazar/logs', async (_req, res) => {
  try {
    const lines = await tailFile('/tmp/balthazar.log', 80)
    res.json({ lines })
  } catch (err) {
    res.status(500).json({ lines: [], _error: err.message })
  }
})

// ── Skills install (ZIP drag & drop) ─────────────────────────────────────────

app.post('/api/skills/install', upload.single('skill'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })
  if (!req.file.originalname.toLowerCase().endsWith('.zip')) {
    return res.status(400).json({ error: 'File must be a .zip archive' })
  }

  try {
    const zip = new AdmZip(req.file.buffer)
    const entries = zip.getEntries()

    const manifestEntry = entries.find(
      (e) => e.entryName === 'manifest.json' || e.entryName.endsWith('/manifest.json')
    )
    let skillName = req.file.originalname.replace(/\.zip$/i, '')
    let skillMeta = {}

    if (manifestEntry) {
      try {
        skillMeta = JSON.parse(manifestEntry.getData().toString('utf-8'))
        if (skillMeta.name) skillName = skillMeta.name
      } catch { /* ignore bad manifest */ }
    }

    const destDir = join(SKILLS_DIR, skillName)
    mkdirSync(destDir, { recursive: true })
    zip.extractAllTo(destDir, /* overwrite */ true)

    res.json({
      success: true,
      skillName,
      path: destDir,
      files: entries.length,
      meta: skillMeta,
    })
  } catch (err) {
    res.status(500).json({ error: `Install failed: ${err.message}` })
  }
})

// ── Workspace agents CRUD ─────────────────────────────────────────────────────

app.get('/api/agents', (_req, res) => {
  res.json(readAgents())
})

app.post('/api/agents', (req, res) => {
  const { id, name, role, color, status } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

  const agents = readAgents()
  const agentId = id || `agent-${Date.now()}`
  const existing = agents.findIndex((a) => a.id === agentId)

  const agent = {
    id: agentId,
    name: name.trim(),
    role: role?.trim() || '',
    color: color || '#ef4444',
    status: status || 'idle',
    logs: [],
    createdAt: existing >= 0 ? agents[existing].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (existing >= 0) agents[existing] = agent
  else agents.push(agent)

  saveAgents(agents)
  res.json(agent)
})

app.patch('/api/agents/:id', (req, res) => {
  const agents = readAgents()
  const idx = agents.findIndex((a) => a.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'Agent not found' })

  agents[idx] = { ...agents[idx], ...req.body, updatedAt: new Date().toISOString() }
  saveAgents(agents)
  res.json(agents[idx])
})

app.delete('/api/agents/:id', (req, res) => {
  const agents = readAgents().filter((a) => a.id !== req.params.id)
  saveAgents(agents)
  res.json({ ok: true })
})

app.get('/api/agents/:id/logs', async (req, res) => {
  const { id } = req.params

  // Special handling for system agents
  if (id === 'alfred-trading') {
    try {
      const lines = await tailFile('/tmp/alfred-v8.log', 100)
      if (lines.length === 0) {
        const fallback = await tailFile(join(ALFRED_DIR, 'alfred.log'), 100)
        return res.json({ lines: fallback, path: '/tmp/alfred-v8.log' })
      }
      return res.json({ lines, path: '/tmp/alfred-v8.log' })
    } catch { return res.json({ lines: [], path: null }) }
  }

  if (id === 'balthazar') {
    try {
      const lines = await tailFile('/tmp/balthazar.log', 100)
      return res.json({ lines, path: '/tmp/balthazar.log' })
    } catch { return res.json({ lines: [], path: null }) }
  }

  // Custom agents
  const candidates = [
    join(ALFRED_DIR, `${id}.log`),
    join(homedir(), '.openclaw', 'agents', `${id}.log`),
    join(homedir(), '.openclaw', 'agents', id, 'agent.log'),
  ]

  for (const p of candidates) {
    if (existsSync(p)) {
      const lines = await tailFile(p, 100)
      return res.json({ lines, path: p })
    }
  }

  res.json({ lines: [], path: null })
})

// ── Boss (BABY BOSS) ──────────────────────────────────────────────────────────

app.get('/api/boss', (_req, res) => {
  res.json(readBoss())
})

app.patch('/api/boss', (req, res) => {
  const current = readBoss()
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() }
  saveBoss(updated)
  res.json(updated)
})

// Boss dispatch — assign todo tasks to agents based on role matching
app.post('/api/boss/dispatch', (_req, res) => {
  const allTasks = readTasks()
  const todoTasks = allTasks.filter((t) => t.status === 'todo')
  const agents = readAgents()
  const boss = readBoss()

  if (todoTasks.length === 0) {
    return res.json({ dispatched: 0, assignments: [], message: 'No pending tasks to dispatch' })
  }

  // System agents (always available)
  const systemAgents = [
    { id: 'alfred-trading', name: 'Alfred', role: 'trading' },
    { id: 'balthazar', name: 'Balthazar', role: 'code' },
  ]
  const allAgents = [...systemAgents, ...agents]

  // Simple category → role matching
  const ROLE_MAP = {
    trading:  ['trading', 'polymarket', 'market', 'finance'],
    code:     ['code', 'development', 'dev', 'programming', 'coding', 'github', 'web'],
    research: ['research', 'analyse', 'analysis', 'search', 'scrape'],
    other:    [],
  }

  function findBestAgent(task) {
    const cat = (task.category || 'other').toLowerCase()
    // Direct category match on agent role
    for (const agent of allAgents) {
      const role = (agent.role || '').toLowerCase()
      for (const [key, keywords] of Object.entries(ROLE_MAP)) {
        if (keywords.includes(cat) || cat === key) {
          if (role.includes(key) || keywords.some((kw) => role.includes(kw))) {
            return agent
          }
        }
      }
    }
    // Fallback: first idle custom agent, or Balthazar
    const idle = agents.find((a) => a.status === 'idle')
    return idle || allAgents.find((a) => a.id === 'balthazar') || allAgents[0]
  }

  const assignments = []
  for (const task of todoTasks) {
    const agent = findBestAgent(task)
    if (agent) {
      task.assignedTo = agent.id
      task.assignedToName = agent.name
      task.status = 'in-progress'
      task.updatedAt = new Date().toISOString()
      assignments.push({ taskId: task.id, taskTitle: task.title, agentId: agent.id, agentName: agent.name })
    }
  }

  saveTasks(allTasks)

  const updated = {
    ...boss,
    assignments,
    lastDispatch: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveBoss(updated)

  res.json({ dispatched: assignments.length, assignments })
})

// ── Tasks CRUD ────────────────────────────────────────────────────────────────

app.get('/api/tasks', (_req, res) => {
  res.json(readTasks())
})

app.post('/api/tasks', (req, res) => {
  const { title, description, priority, category } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' })

  const tasks = readTasks()
  const task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description?.trim() || '',
    priority: priority || 'medium',
    category: category || 'other',
    status: 'todo',
    assignedTo: null,
    assignedToName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  tasks.push(task)
  saveTasks(tasks)
  res.json(task)
})

app.patch('/api/tasks/:id', (req, res) => {
  const tasks = readTasks()
  const idx = tasks.findIndex((t) => t.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'Task not found' })

  tasks[idx] = { ...tasks[idx], ...req.body, updatedAt: new Date().toISOString() }
  saveTasks(tasks)
  res.json(tasks[idx])
})

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readTasks().filter((t) => t.id !== req.params.id)
  saveTasks(tasks)
  res.json({ ok: true })
})

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    alfredDir: ALFRED_DIR,
    skillsDir: SKILLS_DIR,
    stateExists:     existsSync(join(ALFRED_DIR, 'state.json')),
    analyticsExists: existsSync(join(ALFRED_DIR, 'analytics.json')),
    logExists:       existsSync('/tmp/alfred-v8.log'),
    agentsExists:    existsSync(AGENTS_FILE),
    bossExists:      existsSync(BOSS_FILE),
    tasksExists:     existsSync(TASKS_FILE),
    processStatus: {
      alfred:    isProcessRunning('alfred-polymarket.mjs'),
      balthazar: isProcessRunning('balthazar.mjs'),
    },
    timestamp: new Date().toISOString(),
  })
})

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n⚡ Alfred API server ready on http://localhost:${PORT}`)
  console.log(`   Alfred dir  : ${ALFRED_DIR}`)
  console.log(`   Skills dir  : ${SKILLS_DIR}`)
  console.log(`   Agents file : ${AGENTS_FILE}`)
  console.log(`   Boss file   : ${BOSS_FILE}`)
  console.log(`   Tasks file  : ${TASKS_FILE}`)
  console.log(`   Alfred logs : /tmp/alfred-v8.log`)
  console.log(`   Balthazar   : /tmp/balthazar.log`)
  console.log(`   Routes: /api/alfred, /api/agents, /api/boss, /api/tasks, /api/agents/status\n`)
})
