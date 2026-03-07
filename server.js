/**
 * Alfred Mission Control — API Server
 * Expose ~/.openclaw/alfred/ files as JSON endpoints for the React dashboard.
 *
 * Start: npm run server   (port 3001)
 */

import express from 'express'
import cors from 'cors'
import { existsSync, readFileSync, createReadStream } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import readline from 'readline'

const app = express()
const PORT = 3001
const ALFRED_DIR = join(homedir(), '.openclaw', 'alfred')

app.use(cors())
app.use(express.json())

// ── helpers ──────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  if (!existsSync(filePath)) {
    return { _error: `File not found: ${filePath}` }
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    return { _error: `Parse error: ${err.message}` }
  }
}

async function tailFile(filePath, n = 50) {
  if (!existsSync(filePath)) return []
  return new Promise((resolve, reject) => {
    const lines = []
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    })
    rl.on('line', (line) => { if (line.trim()) lines.push(line) })
    rl.on('close', () => resolve(lines.slice(-n)))
    rl.on('error', reject)
  })
}

// ── routes ────────────────────────────────────────────────────────────────────

// Main Alfred state
app.get('/api/alfred', (_req, res) => {
  res.json(readJSON(join(ALFRED_DIR, 'state.json')))
})

// Analytics / stats
app.get('/api/alfred/analytics', (_req, res) => {
  res.json(readJSON(join(ALFRED_DIR, 'analytics.json')))
})

// Last 50 log lines
app.get('/api/alfred/logs', async (_req, res) => {
  try {
    const lines = await tailFile(join(ALFRED_DIR, 'alfred.log'), 50)
    res.json({ lines })
  } catch (err) {
    res.status(500).json({ lines: [], _error: err.message })
  }
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    alfredDir: ALFRED_DIR,
    stateExists: existsSync(join(ALFRED_DIR, 'state.json')),
    analyticsExists: existsSync(join(ALFRED_DIR, 'analytics.json')),
    logExists: existsSync(join(ALFRED_DIR, 'alfred.log')),
    timestamp: new Date().toISOString(),
  })
})

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n⚡ Alfred API server ready on http://localhost:${PORT}`)
  console.log(`   Alfred dir : ${ALFRED_DIR}`)
  console.log(`   Endpoints  : /api/alfred  /api/alfred/analytics  /api/alfred/logs\n`)
})
