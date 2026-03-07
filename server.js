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

const app = express()
const PORT = 3001
const ALFRED_DIR  = join(homedir(), '.openclaw', 'alfred')
const SKILLS_DIR  = join(homedir(), '.openclaw', 'skills')
const AGENTS_FILE = join(ALFRED_DIR, 'agents.json')
const BOSS_FILE   = join(ALFRED_DIR, 'boss.json')

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
  if (!existsSync(BOSS_FILE)) return { currentObjective: '', assignedAgents: [], updatedAt: null }
  try { return JSON.parse(readFileSync(BOSS_FILE, 'utf-8')) }
  catch { return { currentObjective: '', assignedAgents: [], updatedAt: null } }
}

function saveBoss(data) {
  mkdirSync(ALFRED_DIR, { recursive: true })
  writeFileSync(BOSS_FILE, JSON.stringify(data, null, 2))
}

// ── Alfred state routes ───────────────────────────────────────────────────────

app.get('/api/alfred', (_req, res) => {
  res.json(readJSON(join(ALFRED_DIR, 'state.json')))
})

app.get('/api/alfred/analytics', (_req, res) => {
  res.json(readJSON(join(ALFRED_DIR, 'analytics.json')))
})

app.get('/api/alfred/logs', async (_req, res) => {
  try {
    const lines = await tailFile(join(ALFRED_DIR, 'alfred.log'), 50)
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

    // Try to read manifest.json inside the zip for the skill name
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

// List all agents
app.get('/api/agents', (_req, res) => {
  res.json(readAgents())
})

// Create or update an agent
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

// Update agent status only
app.patch('/api/agents/:id', (req, res) => {
  const agents = readAgents()
  const idx = agents.findIndex((a) => a.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'Agent not found' })

  agents[idx] = { ...agents[idx], ...req.body, updatedAt: new Date().toISOString() }
  saveAgents(agents)
  res.json(agents[idx])
})

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  const agents = readAgents().filter((a) => a.id !== req.params.id)
  saveAgents(agents)
  res.json({ ok: true })
})

// Get agent logs
app.get('/api/agents/:id/logs', async (req, res) => {
  const { id } = req.params
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

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    alfredDir: ALFRED_DIR,
    skillsDir: SKILLS_DIR,
    stateExists:     existsSync(join(ALFRED_DIR, 'state.json')),
    analyticsExists: existsSync(join(ALFRED_DIR, 'analytics.json')),
    logExists:       existsSync(join(ALFRED_DIR, 'alfred.log')),
    agentsExists:    existsSync(AGENTS_FILE),
    bossExists:      existsSync(BOSS_FILE),
    timestamp: new Date().toISOString(),
  })
})

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n⚡ Alfred API server ready on http://localhost:${PORT}`)
  console.log(`   Alfred dir  : ${ALFRED_DIR}`)
  console.log(`   Skills dir  : ${SKILLS_DIR}`)
  console.log(`   Agents file : ${AGENTS_FILE}`)
  console.log(`   New routes  : POST /api/skills/install  GET|POST|PATCH|DELETE /api/agents\n`)
})
