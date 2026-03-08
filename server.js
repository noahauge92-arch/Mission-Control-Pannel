import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const ALFRED_STATE = path.join(process.env.HOME, '.openclaw/alfred/state.json');
const AGENTS_FILE = path.join(process.env.HOME, '.openclaw/alfred/agents.json');

function isRunning(script) {
  try {
    execSync(`pgrep -f ${script}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getAlfredData() {
  try {
    const s = JSON.parse(fs.readFileSync(ALFRED_STATE, 'utf8'));
    return {
      id: 'alfred-system',
      name: 'Alfred',
      role: 'Trading Agent — Polymarket',
      color: '#3B82F6',
      status: isRunning('alfred-polymarket.mjs') ? 'running' : 'offline',
      system: true,
      icon: '⚙️',
      bank: s.bank,
      dailyPnl: s.dailyPnl,
      allTimePnl: s.allTimePnl,
      totalTrades: s.totalTrades,
      wins: s.wins,
      regime: s.regime,
      positions: s.positions?.length || 0,
    };
  } catch {
    return {
      id: 'alfred-system',
      name: 'Alfred',
      role: 'Trading Agent — Polymarket',
      color: '#3B82F6',
      status: isRunning('alfred-polymarket.mjs') ? 'running' : 'offline',
      system: true,
      icon: '⚙️',
    };
  }
}

// GET /api/alfred — Alfred data only
app.get('/api/alfred', (req, res) => {
  res.json(getAlfredData());
});

// GET /api/agents — Alfred always first
app.get('/api/agents', (req, res) => {
  let customAgents = [];
  try {
    customAgents = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8') || '[]');
  } catch {
    customAgents = [];
  }
  res.json([getAlfredData(), ...customAgents]);
});

// GET /api/agents/status — live process status
app.get('/api/agents/status', (req, res) => {
  res.json({
    alfred: isRunning('alfred-polymarket.mjs'),
    balthazar: isRunning('balthazar.mjs'),
  });
});

// GET /api/alfred/logs — real logs from alfred-v8.log
app.get('/api/alfred/logs', (req, res) => {
  try {
    const logs = execSync('tail -80 /tmp/alfred-v8.log 2>/dev/null').toString();
    res.json({ logs: logs.split('\n').filter(Boolean) });
  } catch {
    res.json({ logs: [] });
  }
});

// --- Task CRUD ---
const TASKS_FILE = path.join(process.env.HOME, '.openclaw/alfred/tasks.json');

function readTasks() {
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

app.get('/api/tasks', (req, res) => {
  res.json(readTasks());
});

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const task = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
  tasks.push(task);
  writeTasks(tasks);
  res.json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks[idx] = { ...tasks[idx], ...req.body };
  writeTasks(tasks);
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = readTasks();
  tasks = tasks.filter(t => t.id !== req.params.id);
  writeTasks(tasks);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Mission Control API running on http://localhost:${PORT}`);
});
