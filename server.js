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

// ── Alfred mode (dry-run detection) ──────────────────────────────────────────

app.get('/api/alfred/mode', (_req, res) => {
  try {
    const cmd = execSync('ps aux | grep alfred-polymarket | grep -v grep', { stdio: 'pipe' }).toString()
    res.json({ dryRun: cmd.includes('--dry-run'), running: true })
  } catch {
    res.json({ dryRun: false, running: false })
  }
})

// ── Chat helpers ──────────────────────────────────────────────────────────────

function readChatHistory(agentId) {
  const file = join(ALFRED_DIR, `chat-${agentId}.json`)
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) }
  catch { return [] }
}

function saveChatHistory(agentId, history) {
  mkdirSync(ALFRED_DIR, { recursive: true })
  writeFileSync(join(ALFRED_DIR, `chat-${agentId}.json`), JSON.stringify(history.slice(-50), null, 2))
}

// ── Universal chat endpoint ───────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { agentId, message, history = [] } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })
  const msg = message.toLowerCase()

  // ── Alfred (keyword matching) ─────────────────────────────────────────────
  if (agentId === 'alfred') {
    const s  = readJSON(join(ALFRED_DIR, 'state.json'))
    const t  = s.total_trades ?? s.totalTrades ?? 0
    const wr = t > 0 ? Math.round((s.wins ?? 0) / t * 100) : 0
    let reply

    if (msg.includes('pnl') || msg.includes('p&l')) {
      const bank    = Number(s.bank    ?? s.balance    ?? s.capital      ?? 0)
      const today   = Number(s.pnl_today  ?? s.daily_pnl  ?? s.pnl_24h    ?? s.dailyPnl   ?? 0)
      const allTime = Number(s.pnl_alltime ?? s.total_pnl  ?? s.cumulative_pnl ?? s.allTimePnl ?? 0)
      reply = [
        `💰 P&L aujourd'hui: ${today >= 0 ? '+' : ''}${today.toFixed(2)}$`,
        `📈 All-time: ${allTime >= 0 ? '+' : ''}${allTime.toFixed(2)}$`,
        `🎯 Trades: ${t} | WR: ${wr}%`,
        `🏦 Bank: ${bank.toFixed(2)}$`,
      ].join('\n')
    } else if (msg.includes('status') || msg.includes('statut')) {
      const running = isProcessRunning('alfred-polymarket.mjs')
      let dryRun = false
      if (running) {
        try { dryRun = execSync('ps aux | grep alfred-polymarket | grep -v grep', { stdio: 'pipe' }).toString().includes('--dry-run') } catch {}
      }
      const modeStr = !running ? '🔴 OFFLINE' : dryRun ? '🟡 DRY-RUN' : '🟢 RÉEL'
      const regime  = (s.regime ?? s.market_regime ?? '?').toUpperCase()
      const pos     = (s.open_positions ?? s.positions ?? []).length
      reply = [
        `🤖 Alfred v8 — ${modeStr}`,
        `📊 Régime: ${regime}`,
        `📍 Positions: ${pos}/4`,
        `⏸ Halted: ${s.halted ? '🔴 oui' : '✅ non'}`,
      ].join('\n')
    } else if (msg.includes('log')) {
      const lines = await tailFile('/tmp/alfred-v8.log', 10)
      reply = `📋 Logs récents:\n${lines.length ? lines.slice(-10).join('\n') : 'Aucun log.'}`
    } else if (msg.includes('stop') || msg.includes('pause')) {
      if (!s._error) {
        s.halted = true
        writeFileSync(join(ALFRED_DIR, 'state.json'), JSON.stringify(s, null, 2))
      }
      reply = '⏸ Alfred mis en pause. (halted = true)\nEnvoie "start" pour reprendre.'
    } else if (msg.includes('start') || msg.includes('reprend') || msg.includes('resume')) {
      if (!s._error) {
        s.halted = false
        writeFileSync(join(ALFRED_DIR, 'state.json'), JSON.stringify(s, null, 2))
      }
      reply = '▶️ Alfred relancé ! (halted = false) 🎯'
    } else if (msg.includes('position') || msg.includes('pos')) {
      const positions = s.open_positions ?? s.positions ?? []
      if (!positions.length) {
        reply = '📍 Aucune position ouverte.'
      } else {
        const lines = positions.slice(0, 5).map((p, i) => {
          const name = (p.market ?? p.question ?? `Position ${i + 1}`).slice(0, 38)
          const side = (p.side ?? p.outcome ?? '?').toUpperCase()
          const pnl  = p.pnl ?? p.unrealized_pnl
          return `${i + 1}. ${name} | ${side}${pnl != null ? ` | ${Number(pnl) >= 0 ? '+' : ''}${Number(pnl).toFixed(2)}$` : ''}`
        })
        reply = `📍 Positions (${positions.length}):\n${lines.join('\n')}`
      }
    } else {
      const running = isProcessRunning('alfred-polymarket.mjs')
      reply = `🤖 Alfred — ${running ? '🟢 actif' : '🔴 offline'}\nCommandes: pnl · status · logs · stop · start · positions`
    }

    const hist = readChatHistory('alfred')
    hist.push({ role: 'user', content: message, ts: Date.now() })
    hist.push({ role: 'assistant', content: reply, ts: Date.now() })
    saveChatHistory('alfred', hist)
    return res.json({ reply })
  }

  // ── Balthazar (keyword matching) ──────────────────────────────────────────
  if (agentId === 'balthazar') {
    const running = isProcessRunning('balthazar.mjs')
    let reply

    if (msg.includes('news')) {
      const feed = readJSON(join(ALFRED_DIR, 'news-feed.json'))
      if (Array.isArray(feed) && feed.length) {
        const top = feed.slice(0, 5).map((n) => `• [${n.category ?? 'news'}] ${n.title}`).join('\n')
        reply = `📰 Dernières news:\n${top}`
      } else {
        reply = '📰 Aucune news disponible.'
      }
    } else if (msg.includes('log')) {
      const lines = await tailFile('/tmp/balthazar.log', 10)
      reply = `📋 Logs Balthazar:\n${lines.length ? lines.join('\n') : 'Aucun log.'}`
    } else if (msg.includes('status') || msg.includes('statut')) {
      reply = `📰 Balthazar — ${running ? '🟢 actif' : '🔴 offline'}\nRôle: scraping actualités & codeur web GitHub`
    } else {
      reply = `📰 Balthazar — ${running ? '🟢 actif' : '🔴 offline'}\nCommandes: news · status · logs`
    }

    const hist = readChatHistory('balthazar')
    hist.push({ role: 'user', content: message, ts: Date.now() })
    hist.push({ role: 'assistant', content: reply, ts: Date.now() })
    saveChatHistory('balthazar', hist)
    return res.json({ reply })
  }

  // ── Baby Boss + agents custom → DeepSeek ─────────────────────────────────
  const s      = readJSON(join(ALFRED_DIR, 'state.json'))
  const agents = readAgents()
  const tasks  = readTasks()
  const t      = s.total_trades ?? s.totalTrades ?? 0
  const wr     = t > 0 ? Math.round((s.wins ?? 0) / t * 100) : 0

  const systemPrompt = agentId === 'boss'
    ? `Tu es Baby Boss, chef de projet de l'écosystème OpenClaw de Noah.
Tu gères:
- Alfred (trading Polymarket): Bank=${Number(s.bank ?? s.balance ?? 0).toFixed(2)}$, P&L all-time=${Number(s.pnl_alltime ?? s.total_pnl ?? s.allTimePnl ?? 0).toFixed(2)}$, Trades=${t}, WR=${wr}%, Régime=${s.regime ?? s.market_regime ?? 'NORMAL'}
- Balthazar (scraping news & coding)
- Agents custom: ${agents.map((a) => `${a.name} (${a.role})`).join(', ') || 'aucun'}
- Tâches: ${tasks.filter((tk) => tk.status === 'todo').length} todo | ${tasks.filter((tk) => tk.status === 'in-progress').length} en cours | ${tasks.filter((tk) => tk.status === 'done').length} done
Réponds en français, concis et actionnable.`
    : (() => {
        const agent = agents.find((a) => a.id === agentId)
        return `Tu es ${agent?.name ?? 'un agent'}, rôle: ${agent?.role ?? 'assistant'}. Réponds en français, utile et concis.`
      })()

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-ca1cb73de7124b8fb2a0aa1d11ca227a'
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: message },
        ],
      }),
    })
    const data  = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? 'Pas de réponse DeepSeek.'
    const hist  = readChatHistory(agentId)
    hist.push({ role: 'user', content: message, ts: Date.now() })
    hist.push({ role: 'assistant', content: reply, ts: Date.now() })
    saveChatHistory(agentId, hist)
    res.json({ reply })
  } catch (e) {
    res.json({ reply: `Erreur: ${e.message}` })
  }
})

app.get('/api/chat/:agentId/history', (req, res) => {
  res.json(readChatHistory(req.params.agentId))
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
