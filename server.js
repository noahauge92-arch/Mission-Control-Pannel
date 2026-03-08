/**
 * Alfred Mission Control — API Server
 * Start: npm run server   (port 3001)
 */

import { config } from 'dotenv'
config()

import express from 'express'
import cors from 'cors'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

const HOME        = process.env.HOME
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ca1cb73de7124b8fb2a0aa1d11ca227a'

// ── Paths ─────────────────────────────────────────────────────────────────────
const ALFRED_STATE = path.join(HOME, '.openclaw/alfred/state.json')
const ALFRED_LOG   = '/tmp/alfred-v8.log'
const TASKS_FILE   = path.join(HOME, '.openclaw/alfred/tasks.json')
const AGENTS_FILE  = path.join(HOME, '.openclaw/alfred/agents.json')
const BOSS_FILE    = path.join(HOME, '.openclaw/alfred/boss.json')
const SKILLS_DIR   = path.join(HOME, '.openclaw/skills')

// Create agent dirs on startup
;['alfred', 'balthazar', 'hugodecrypte', '2fois', 'patron', 'groupe'].forEach((a) =>
  fs.mkdirSync(path.join(HOME, `.openclaw/${a}`), { recursive: true })
)
fs.mkdirSync(SKILLS_DIR, { recursive: true })

// ── Cache (prevents OOM from hot-polling) ─────────────────────────────────────
const _cache = {}
function cached(key, ttlMs, fn) {
  const now = Date.now()
  if (_cache[key] && now - _cache[key].ts < ttlMs) return _cache[key].data
  const data = fn()
  _cache[key] = { data, ts: now }
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return fallback }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function alfredRunning() {
  try { return execSync('pgrep -f alfred-polymarket.mjs', { stdio: 'pipe' }).toString().trim().length > 0 }
  catch { return false }
}

function isDryRun() {
  try { return execSync('ps aux | grep alfred-polymarket | grep -v grep', { stdio: 'pipe' }).toString().includes('--dry-run') }
  catch { return false }
}

// ── Alfred endpoints ──────────────────────────────────────────────────────────
app.get('/api/alfred', (_req, res) => {
  const s = readJson(ALFRED_STATE, { bank: 100, allTimePnl: 0, dailyPnl: 0, totalTrades: 0, wins: 0, regime: 'NORMAL', positions: [] })
  const t = s.totalTrades ?? s.total_trades ?? 0
  res.json({
    ...s,
    running:  alfredRunning(),
    dryRun:   isDryRun(),
    winRate:  t > 0 ? Math.round((s.wins ?? 0) / t * 100) : 0,
  })
})

app.get('/api/alfred/mode', (_req, res) => {
  res.json({ running: alfredRunning(), dryRun: isDryRun() })
})

app.get('/api/alfred/logs', (_req, res) => {
  const lines = cached('alfred-logs', 30_000, () => {
    try { return execSync(`tail -20 ${ALFRED_LOG} 2>/dev/null`, { stdio: 'pipe' }).toString().split('\n').filter(Boolean) }
    catch { return [] }
  })
  res.json({ lines })
})

app.get('/api/alfred/analytics', (_req, res) => {
  const data = cached('alfred-analytics', 15_000, () =>
    readJson(path.join(HOME, '.openclaw/alfred/analytics.json'), {})
  )
  res.json(data)
})

// ── Agents (no Alfred — it has its own endpoints) ─────────────────────────────
const SYSTEM_AGENTS = [
  { id: 'patron',       name: 'Le Patron',    icon: '👑', color: '#F59E0B', role: 'CEO & Coordinateur',  badge: 'DeepSeek' },
  { id: 'balthazar',    name: 'Balthazar',    icon: '💻', color: '#8B5CF6', role: 'Dev & GitHub',        badge: 'DeepSeek' },
  { id: 'hugodecrypte', name: 'Hugo Décrypte',icon: '🔍', color: '#3B82F6', role: 'News & Recherche',    badge: 'DeepSeek' },
  { id: '2fois',        name: '2fois',         icon: '📱', color: '#EC4899', role: 'Réseaux Sociaux',     badge: 'DeepSeek' },
]

app.get('/api/agents', (_req, res) => {
  const custom = readJson(AGENTS_FILE, [])
  res.json([...SYSTEM_AGENTS, ...custom])
})

app.post('/api/agents', (req, res) => {
  const custom = readJson(AGENTS_FILE, [])
  const agent  = { id: `agent-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() }
  custom.push(agent)
  writeJson(AGENTS_FILE, custom)
  res.json(agent)
})

app.patch('/api/agents/:id', (req, res) => {
  const custom = readJson(AGENTS_FILE, [])
  const idx    = custom.findIndex((a) => a.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  custom[idx] = { ...custom[idx], ...req.body, updatedAt: new Date().toISOString() }
  writeJson(AGENTS_FILE, custom)
  res.json(custom[idx])
})

app.delete('/api/agents/:id', (req, res) => {
  const custom = readJson(AGENTS_FILE, []).filter((a) => a.id !== req.params.id)
  writeJson(AGENTS_FILE, custom)
  res.json({ ok: true })
})

app.get('/api/agents/status', (_req, res) => {
  res.json({ alfred: alfredRunning(), balthazar: false })
})

app.get('/api/agents/:id/logs', (_req, res) => {
  res.json({ lines: [] })
})

// ── Boss ──────────────────────────────────────────────────────────────────────
app.get('/api/boss', (_req, res) => {
  res.json(readJson(BOSS_FILE, { currentObjective: '', assignments: [], updatedAt: null }))
})

app.patch('/api/boss', (req, res) => {
  const current = readJson(BOSS_FILE, {})
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() }
  writeJson(BOSS_FILE, updated)
  res.json(updated)
})

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get('/api/tasks', (_req, res) => res.json(readJson(TASKS_FILE, [])))

app.post('/api/tasks', (req, res) => {
  const tasks = readJson(TASKS_FILE, [])
  const task  = {
    id:          Date.now().toString(),
    title:       req.body.title || '',
    description: req.body.description || '',
    priority:    req.body.priority || 'medium',
    category:    req.body.category || 'other',
    assignedTo:  req.body.assignedTo || null,
    status:      'todo',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  }
  tasks.push(task)
  writeJson(TASKS_FILE, tasks)
  res.json(task)
})

app.patch('/api/tasks/:id', (req, res) => {
  const tasks = readJson(TASKS_FILE, [])
  const idx   = tasks.findIndex((t) => t.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  tasks[idx] = { ...tasks[idx], ...req.body, updatedAt: new Date().toISOString() }
  writeJson(TASKS_FILE, tasks)
  res.json(tasks[idx])
})

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readJson(TASKS_FILE, []).filter((t) => t.id !== req.params.id)
  writeJson(TASKS_FILE, tasks)
  res.json({ ok: true })
})

// Résultat complet d'une tâche (pour le modal "Voir résultat")
app.get('/api/tasks/:id/result', (req, res) => {
  const tasks = readJson(TASKS_FILE, [])
  const task  = tasks.find((t) => t.id === req.params.id)
  if (!task) return res.status(404).json({ error: 'Not found' })
  res.json(task)
})

// Statut de l'orchestrateur (logs récents)
app.get('/api/orchestrator/status', (_req, res) => {
  const lines = fs.existsSync('/tmp/orchestrator.log')
    ? fs.readFileSync('/tmp/orchestrator.log', 'utf8').split('\n').filter(Boolean).slice(-20)
    : []
  let running = false
  try { execSync('pgrep -f orchestrator.mjs', { stdio: 'pipe' }); running = true } catch {}
  res.json({ running, lines })
})

// ── DeepSeek ──────────────────────────────────────────────────────────────────
async function deepseek(messages, systemPrompt, maxTokens = 400) {
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model:      'deepseek-chat',
      max_tokens: maxTokens,
      messages:   [{ role: 'system', content: systemPrompt }, ...messages.slice(-10)],
    }),
  })
  if (!resp.ok) throw new Error(`DeepSeek HTTP ${resp.status}`)
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || 'Pas de réponse.'
}

function buildPrompt(agentId) {
  const s = readJson(ALFRED_STATE, { bank: 100, allTimePnl: 0, totalTrades: 0, wins: 0, regime: 'NORMAL' })
  const t  = s.totalTrades ?? s.total_trades ?? 0
  const wr = t > 0 ? Math.round((s.wins ?? 0) / t * 100) : 0
  const tasks   = readJson(TASKS_FILE, [])
  const myTasks = tasks.filter((tk) => tk.assignedTo === agentId && tk.status !== 'done')
  const bank    = Number(s.bank ?? s.balance ?? 0)
  const pnl     = Number(s.allTimePnl ?? s.pnl_alltime ?? s.total_pnl ?? 0)

  const base     = `Tu fais partie de l'équipe OpenClaw de Noah. Réponds toujours en français, sois concis et utile.`
  const alfCtx   = `Alfred (trading Polymarket): Bank=${bank.toFixed(2)}$, P&L=${pnl.toFixed(2)}$, Trades=${t}, WR=${wr}%, Régime=${s.regime ?? 'NORMAL'}.`
  const taskCtx  = myTasks.length > 0
    ? `\nTes tâches assignées: ${myTasks.map((tk) => `[${tk.priority || 'normal'}] ${tk.title}`).join(', ')}`
    : ''

  switch (agentId) {
    case 'patron':
      return `${base} Tu es Le Patron, CEO qui coordonne toute l'équipe. ${alfCtx} Agents: Balthazar (code), Hugo Décrypte (news), 2fois (réseaux). Tâches todo: ${tasks.filter((t) => t.status === 'todo').length}.${taskCtx}`
    case 'balthazar':
      return `${base} Tu es Balthazar, développeur senior expert en Node.js, Python, GitHub. Tu codes, debugues, fais des PRs.${taskCtx}`
    case 'hugodecrypte':
      return `${base} Tu es Hugo Décrypte, expert en veille et analyse d'information. Tu analyses les actualités, tendances, fais des résumés analytiques.${taskCtx}`
    case '2fois':
      return `${base} Tu es 2fois, expert en réseaux sociaux et contenu. Twitter/X, TikTok, Instagram. Tu crées du contenu engageant et analyses les tendances.${taskCtx}`
    default: {
      const custom = readJson(AGENTS_FILE, []).find((a) => a.id === agentId)
      return `${base} Tu es ${custom?.name || agentId}, rôle: ${custom?.role || 'assistant'}.${taskCtx}`
    }
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────
const GROUPE_META = {
  patron:       { name: 'Le Patron',    icon: '👑', color: '#F59E0B' },
  balthazar:    { name: 'Balthazar',    icon: '💻', color: '#8B5CF6' },
  hugodecrypte: { name: 'Hugo Décrypte',icon: '🔍', color: '#3B82F6' },
  '2fois':      { name: '2fois',        icon: '📱', color: '#EC4899' },
}

app.post('/api/chat', async (req, res) => {
  const { agentId, message, history = [] } = req.body
  if (!agentId || !message) return res.status(400).json({ error: 'agentId et message requis' })

  const msgs = [...history, { role: 'user', content: message }]

  try {
    if (agentId === 'groupe' || agentId === 'group') {
      const ids     = Object.keys(GROUPE_META)
      const results = await Promise.allSettled(
        ids.map((id) => deepseek(msgs, buildPrompt(id)))
      )
      const replies = results.map((r, i) => ({
        agentId: ids[i],
        agent:   GROUPE_META[ids[i]].name,
        icon:    GROUPE_META[ids[i]].icon,
        color:   GROUPE_META[ids[i]].color,
        reply:   r.status === 'fulfilled' ? r.value : 'Erreur de connexion.',
      }))

      // Persist group history (max 40 messages)
      const histFile = path.join(HOME, '.openclaw/groupe/chat.json')
      const hist     = readJson(histFile, [])
      hist.push({ role: 'user', content: message, ts: Date.now() })
      replies.forEach((r) => hist.push({ role: 'assistant', agentId: r.agentId, agentName: r.agent, agentIcon: r.icon, agentColor: r.color, content: r.reply, ts: Date.now() }))
      writeJson(histFile, hist.slice(-40))

      return res.json({ replies })
    }

    const reply    = await deepseek(msgs, buildPrompt(agentId))
    const histFile = path.join(HOME, `.openclaw/${agentId}/chat.json`)
    const hist     = readJson(histFile, [])
    hist.push({ role: 'user', content: message, ts: Date.now() })
    hist.push({ role: 'assistant', content: reply, ts: Date.now() })
    writeJson(histFile, hist.slice(-40))

    res.json({ reply })
  } catch (e) {
    console.error('Chat error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/chat/:agentId/history', (req, res) => {
  const histFile = path.join(HOME, `.openclaw/${req.params.agentId}/chat.json`)
  res.json(readJson(histFile, []))
})

// ── Skills install ────────────────────────────────────────────────────────────
import multer from 'multer'
import AdmZip from 'adm-zip'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

app.post('/api/skills/install', upload.single('skill'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })
  if (!req.file.originalname.toLowerCase().endsWith('.zip'))
    return res.status(400).json({ error: 'File must be a .zip archive' })
  try {
    const zip      = new AdmZip(req.file.buffer)
    let skillName  = req.file.originalname.replace(/\.zip$/i, '')
    const manifest = zip.getEntries().find((e) => e.entryName.endsWith('manifest.json'))
    if (manifest) {
      try { const m = JSON.parse(manifest.getData().toString('utf-8')); if (m.name) skillName = m.name } catch {}
    }
    const destDir = path.join(SKILLS_DIR, skillName)
    fs.mkdirSync(destDir, { recursive: true })
    zip.extractAllTo(destDir, true)
    res.json({ success: true, skillName, path: destDir, files: zip.getEntries().length })
  } catch (e) {
    res.status(500).json({ error: `Install failed: ${e.message}` })
  }
})

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:      'ok',
    alfredDir:   path.join(HOME, '.openclaw/alfred'),
    stateExists: fs.existsSync(ALFRED_STATE),
    logExists:   fs.existsSync(ALFRED_LOG),
    processStatus: { alfred: alfredRunning(), balthazar: false },
    timestamp:   new Date().toISOString(),
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(3001, () => {
  console.log('╔══════════════════════════════════════╗')
  console.log('║  ⚡ MISSION CONTROL — PORT 3001      ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(`   Home: ${HOME}`)
  console.log(`   DeepSeek key: ${DEEPSEEK_KEY.slice(0, 8)}...`)
})
