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
const HOME        = homedir()
const ALFRED_DIR  = join(HOME, '.openclaw', 'alfred')
const SKILLS_DIR  = join(HOME, '.openclaw', 'skills')
const AGENTS_FILE = join(ALFRED_DIR, 'agents.json')
const BOSS_FILE   = join(ALFRED_DIR, 'boss.json')
const TASKS_FILE  = join(ALFRED_DIR, 'tasks.json')

// ── Per-agent directories (each agent owns its state + chat history) ──────────
const AGENT_DIRS = {
  alfred:       ALFRED_DIR,
  balthazar:    join(HOME, '.openclaw', 'balthazar'),
  boss:         join(HOME, '.openclaw', 'patron'),
  patron:       join(HOME, '.openclaw', 'patron'),
  hugodecrypte: join(HOME, '.openclaw', 'hugodecrypte'),
  '2fois':      join(HOME, '.openclaw', '2fois'),
  group:        join(HOME, '.openclaw', 'groupe'),
  groupe:       join(HOME, '.openclaw', 'groupe'),
}
// Create all dirs on startup (agents added later via /api/agents will be created on demand)
;[ALFRED_DIR, SKILLS_DIR, ...new Set(Object.values(AGENT_DIRS))].forEach((d) => mkdirSync(d, { recursive: true }))

function agentDir(agentId) {
  return AGENT_DIRS[agentId] ?? join(HOME, '.openclaw', agentId)
}

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
  const dir  = agentDir(agentId)
  const file = join(dir, 'chat.json')
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) }
  catch { return [] }
}

function saveChatHistory(agentId, history) {
  const dir = agentDir(agentId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'chat.json'), JSON.stringify(history.slice(-50), null, 2))
}

// ── Universal chat endpoint ───────────────────────────────────────────────────

// Helper: call DeepSeek for a single agent and return reply string
async function deepseekCall(systemPrompt, history, message, maxTokens = 500) {
  const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-ca1cb73de7124b8fb2a0aa1d11ca227a'
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:      'deepseek-chat',
      max_tokens: maxTokens,
      messages:   [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: message },
      ],
    }),
  })
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? 'Pas de réponse DeepSeek.'
}

// Helper: build system prompt per agentId
function buildSystemPrompt(agentId, s, agents, tasks) {
  const t  = s.total_trades ?? s.totalTrades ?? 0
  const wr = t > 0 ? Math.round((s.wins ?? 0) / t * 100) : 0

  // Assigned tasks for this agent
  const myTasks = tasks.filter((tk) => tk.assignedTo === agentId && tk.status !== 'done')
  const taskStr = myTasks.length
    ? `\nTes tâches assignées:\n${myTasks.map((tk) => `- [${tk.status}] ${tk.title}${tk.description ? ': ' + tk.description : ''}`).join('\n')}`
    : ''

  switch (agentId) {
    case 'patron':
    case 'boss':
      return `Tu es Le Patron, CEO et coordinateur de l'écosystème OpenClaw de Noah.
Tu supervises tous les agents IA et prends des décisions stratégiques.
Contexte Alfred: Bank=${Number(s.bank ?? s.balance ?? 0).toFixed(2)}$, P&L=${Number(s.pnl_alltime ?? s.total_pnl ?? s.allTimePnl ?? 0).toFixed(2)}$, Trades=${t}, WR=${wr}%, Régime=${s.regime ?? s.market_regime ?? 'NORMAL'}
Agents: Balthazar (code), Hugo Décrypte (veille info), 2fois (réseaux sociaux), Alfred (trading).
Custom: ${agents.map((a) => `${a.name} (${a.role})`).join(', ') || 'aucun'}
Tâches: ${tasks.filter((tk) => tk.status === 'todo').length} todo | ${tasks.filter((tk) => tk.status === 'in-progress').length} en cours | ${tasks.filter((tk) => tk.status === 'done').length} done${taskStr}
Réponds en français, sois stratégique et concis. Si tu mentionnes une action concrète à réaliser, formule-la clairement.`

    case 'balthazar':
      return `Tu es Balthazar, agent IA codeur et analyste de l'écosystème OpenClaw de Noah.
Tu es expert en JavaScript/Node.js, React, APIs, GitHub, scraping et automatisation.
Tu réponds en français, précis et technique.${taskStr}`

    case 'hugodecrypte':
      return `Tu es Hugo Décrypte, expert en veille informationnelle et recherche pour Noah.
Tu analyses les actualités, identifies les tendances importantes, fais des résumés clairs.
Tu connais l'écosystème OpenClaw : Alfred trade sur Polymarket, Balthazar code, 2fois gère les réseaux sociaux.
Réponds en français, sois analytique et précis.${taskStr}`

    case '2fois':
      return `Tu es 2fois, expert en réseaux sociaux et création de contenu pour Noah.
Tu analyses les tendances Twitter/X, TikTok, Instagram, rédiges du contenu engageant, surveilles les mentions.
Tu connais l'écosystème OpenClaw.
Réponds en français, sois créatif et concis.${taskStr}`

    default: {
      const agent = agents.find((a) => a.id === agentId)
      return `Tu es ${agent?.name ?? agentId}, assistant spécialisé dans l'écosystème OpenClaw de Noah.
Rôle: ${agent?.role ?? 'assistant IA'}.
Réponds en français, sois utile et concis.${taskStr}`
    }
  }
}

// Helper: if patron response mentions action verbs, auto-create tasks
function maybeCreateTasksFromPatron(reply, tasks) {
  const actionPatterns = [
    /(?:il faut|faut|dois|doit|va|vais|devrait|doit|assign[ée]?|confie|demande à|crée|créer|développe|analyser?|surveiller?|publier?|poster?|coder?|scraper?|vérifier?)\s+(.{10,80})/gi,
  ]
  const newTasks = []
  for (const pattern of actionPatterns) {
    let m
    while ((m = pattern.exec(reply)) !== null) {
      const title = m[1].replace(/[.,;:!?]+$/, '').trim()
      if (title.length > 10 && !tasks.some((t) => t.title.toLowerCase() === title.toLowerCase())) {
        newTasks.push({
          id:             crypto.randomUUID(),
          title:          title.slice(0, 120),
          description:    `Auto-créé depuis Le Patron`,
          priority:       'medium',
          category:       'other',
          status:         'todo',
          assignedTo:     null,
          assignedToName: null,
          createdAt:      new Date().toISOString(),
          updatedAt:      new Date().toISOString(),
        })
      }
    }
  }
  if (newTasks.length > 0) {
    saveTasks([...tasks, ...newTasks.slice(0, 3)])  // max 3 tasks per response
  }
}

app.post('/api/chat', async (req, res) => {
  const { agentId, message, history = [] } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })

  const s      = readJSON(join(ALFRED_DIR, 'state.json'))
  const agents = readAgents()
  const tasks  = readTasks()

  // ── Groupe: parallel DeepSeek calls to all conversational agents ──────────
  if (agentId === 'groupe' || agentId === 'group') {
    const GROUPE_AGENTS = [
      { id: 'patron',       name: 'Le Patron',     icon: '👑', color: '#f59e0b' },
      { id: 'balthazar',    name: 'Balthazar',      icon: '💻', color: '#3b82f6' },
      { id: 'hugodecrypte', name: 'Hugo Décrypte',  icon: '🔍', color: '#8b5cf6' },
      { id: '2fois',        name: '2fois',           icon: '📱', color: '#ec4899' },
    ]

    try {
      const replies = await Promise.all(
        GROUPE_AGENTS.map(async (ag) => {
          const prompt = buildSystemPrompt(ag.id, s, agents, tasks)
          const reply  = await deepseekCall(prompt, history, message, 350)
          return { agent: ag.name, agentId: ag.id, icon: ag.icon, color: ag.color, reply }
        })
      )

      const hist = readChatHistory('groupe')
      hist.push({ role: 'user', content: message, ts: Date.now() })
      replies.forEach((r) => hist.push({ role: 'assistant', agentId: r.agentId, agentName: r.agent, agentIcon: r.icon, agentColor: r.color, content: r.reply, ts: Date.now() }))
      saveChatHistory('groupe', hist)

      return res.json({ replies })
    } catch (e) {
      return res.json({ replies: [{ agent: 'Erreur', agentId: 'error', icon: '⚠️', color: '#ef4444', reply: e.message }] })
    }
  }

  // ── All conversational agents → DeepSeek ──────────────────────────────────
  const systemPrompt = buildSystemPrompt(agentId, s, agents, tasks)

  try {
    const reply = await deepseekCall(systemPrompt, history, message)

    // Le Patron auto-creates tasks from its responses
    if (agentId === 'patron' || agentId === 'boss') {
      maybeCreateTasksFromPatron(reply, tasks)
    }

    const hist = readChatHistory(agentId)
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

// ── Group discussion — Le Patron coordonne tous les agents ────────────────────

app.post('/api/chat/group', async (req, res) => {
  const { message, history = [] } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })

  const s            = readJSON(join(ALFRED_DIR, 'state.json'))
  const customAgents = readAgents()
  const tasks        = readTasks()
  const t  = s.total_trades ?? s.totalTrades ?? 0
  const wr = t > 0 ? Math.round((s.wins ?? 0) / t * 100) : 0

  const agentList = [
    { id: 'alfred',    name: 'Alfred',    role: 'Trading Polymarket 24/7' },
    { id: 'balthazar', name: 'Balthazar', role: 'Coding & scraping news'  },
    ...customAgents.map((a) => ({ id: a.id, name: a.name, role: a.role || 'Agent custom' })),
  ]

  const systemPrompt =
`Tu es Le Patron, CEO de l'écosystème IA OpenClaw de Noah.
Tu coordonnes une équipe d'agents IA :
${agentList.map((a) => `- ${a.name}: ${a.role}`).join('\n')}

Contexte temps réel :
- Alfred: Bank=${Number(s.bank ?? s.balance ?? 0).toFixed(2)}$, P&L=${Number(s.pnl_alltime ?? s.total_pnl ?? s.allTimePnl ?? 0).toFixed(2)}$, Trades=${t}, WR=${wr}%, Régime=${s.regime ?? s.market_regime ?? 'NORMAL'}
- Tâches: ${tasks.filter((tk) => tk.status === 'todo').length} todo | ${tasks.filter((tk) => tk.status === 'in-progress').length} en cours | ${tasks.filter((tk) => tk.status === 'done').length} done

INSTRUCTIONS CRITIQUES :
1. Réponds avec ce format exact — un agent par bloc :
   [LE PATRON]: ta coordination (toujours présent en premier)
   [ALFRED]: réponse si pertinent
   [BALTHAZAR]: réponse si pertinent
   [NOM_AGENT]: réponse si pertinent
2. Inclus SEULEMENT les agents qui ont quelque chose d'utile à dire
3. Réponds en français, concis et actionnable`

  try {
    const apiKey   = process.env.DEEPSEEK_API_KEY || 'sk-ca1cb73de7124b8fb2a0aa1d11ca227a'
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:      'deepseek-chat',
        max_tokens: 800,
        messages:   [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8),
          { role: 'user', content: message },
        ],
      }),
    })
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''

    // Known agent colour map (upper-cased key → display info)
    const AGENT_MAP = {
      'LE PATRON': { id: 'boss',      name: 'Le Patron',  icon: '👑', color: '#f59e0b' },
      'ALFRED':    { id: 'alfred',    name: 'Alfred',     icon: '⚙️', color: '#22c55e' },
      'BALTHAZAR': { id: 'balthazar', name: 'Balthazar',  icon: '📰', color: '#3b82f6' },
      ...Object.fromEntries(
        customAgents.map((a) => [
          a.name.toUpperCase(),
          { id: a.id, name: a.name, icon: '🤖', color: a.color || '#a855f7' },
        ])
      ),
    }

    // Parse [AGENT]: content blocks
    const parsed  = []
    let   current = null
    for (const line of text.split('\n')) {
      const m = line.match(/^\[([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ\s\-]+)\]:\s*(.*)/)
      if (m) {
        if (current) parsed.push(current)
        const key  = m[1].trim()
        const info = AGENT_MAP[key] ?? { id: key.toLowerCase().replace(/\s+/g, '-'), name: key, icon: '🤖', color: '#a855f7' }
        current = { ...info, content: m[2], ts: Date.now() }
      } else if (current && line.trim()) {
        current.content += '\n' + line
      }
    }
    if (current) parsed.push(current)

    const messages = parsed.length
      ? parsed.map((m) => ({ ...m, content: m.content.trim() })).filter((m) => m.content)
      : [{ id: 'boss', name: 'Le Patron', icon: '👑', color: '#f59e0b', content: text, ts: Date.now() }]

    // Persist group history (agent meta included for UI reconstruction)
    const hist = readChatHistory('group')
    hist.push({ role: 'user', content: message, ts: Date.now() })
    messages.forEach((m) => {
      hist.push({ role: 'assistant', agentId: m.id, agentName: m.name, agentIcon: m.icon, agentColor: m.color, content: m.content, ts: Date.now() })
    })
    saveChatHistory('group', hist)

    res.json({ messages })
  } catch (e) {
    res.json({ messages: [{ id: 'boss', name: 'Le Patron', icon: '👑', color: '#f59e0b', content: `Erreur: ${e.message}`, ts: Date.now() }] })
  }
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
