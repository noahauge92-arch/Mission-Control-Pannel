// ── Skills (ClaWHub — curated list) ──────────────────────────────────────────
export const initialSkills = [
  { id: 'clawhub',           name: 'ClaWHub',            category: 'Development',  description: 'Core skill hub — manages and orchestrates all other skills.',           version: 'v1.0.0', rating: 5.0, source: 'ClawBot Core', installed: true,  icon: '⚡', params: {} },
  { id: 'clawdhub',          name: 'ClaWDHub',           category: 'Development',  description: 'Docker-based skill deployment and container management.',               version: 'v1.1.0', rating: 4.7, source: 'ClawBot Core', installed: true,  icon: '🐳', params: {} },
  { id: 'github',            name: 'GitHub',             category: 'Development',  description: 'Git operations, PR management, issue tracking, repo automation.',       version: 'v2.0.0', rating: 4.9, source: 'ClawBot Core', installed: true,  icon: '🐙', params: { token: '***' } },
  { id: 'polymarket',        name: 'Polymarket',         category: 'Analytics',    description: 'Polymarket trading integration — odds, positions, trade execution.',     version: 'v3.1.0', rating: 4.8, source: 'ClawBot Core', installed: true,  icon: '📊', params: {} },
  { id: 'notion',            name: 'Notion',             category: 'Productivity', description: 'Read/write Notion databases and pages directly from agents.',           version: 'v1.4.0', rating: 4.6, source: 'Community',   installed: false, icon: '📝', params: {} },
  { id: 'obsidian',          name: 'Obsidian',           category: 'Productivity', description: 'Obsidian vault integration — notes, links, knowledge graph.',           version: 'v1.2.0', rating: 4.5, source: 'Community',   installed: false, icon: '🗃️', params: {} },
  { id: 'gog',               name: 'GoG',                category: 'Research',     description: 'Graph-of-Graphs reasoning — multi-hop knowledge extraction.',           version: 'v0.9.0', rating: 4.3, source: 'Community',   installed: false, icon: '🔗', params: {} },
  { id: 'weather',           name: 'Weather',            category: 'Research',     description: 'Real-time weather data, forecasts, and climate alerts.',                version: 'v1.0.0', rating: 4.2, source: 'Community',   installed: false, icon: '🌤️', params: {} },
  { id: 'healthcheck',       name: 'Health Check',       category: 'Analytics',    description: 'Monitor system health, uptime, and service availability.',              version: 'v1.0.0', rating: 4.4, source: 'ClawBot Core', installed: true,  icon: '💚', params: {} },
  { id: 'nano-banana-pro',   name: 'Nano Banana Pro',    category: 'Analytics',    description: 'Advanced micro-trading signals and banana-curve analysis.',             version: 'v2.0.0', rating: 4.1, source: 'Community',   installed: false, icon: '🍌', params: {} },
  { id: 'skill-creator',     name: 'Skill Creator',      category: 'Development',  description: 'Build, test, and package new skills from templates.',                   version: 'v1.0.0', rating: 4.6, source: 'ClawBot Core', installed: true,  icon: '🛠️', params: {} },
  { id: 'skill-scanner',     name: 'Skill Scanner',      category: 'Analytics',    description: 'Scan and audit installed skills for vulnerabilities and updates.',      version: 'v1.0.0', rating: 4.3, source: 'ClawBot Core', installed: true,  icon: '🔍', params: {} },
  { id: 'self-improvement',  name: 'Self Improvement',   category: 'Development',  description: 'Agent self-optimization — learn from past runs, tune parameters.',     version: 'v0.8.0', rating: 4.0, source: 'Community',   installed: false, icon: '🧠', params: {} },
  { id: 'agent-browser',     name: 'Agent Browser',      category: 'Research',     description: 'Headless browser control — scrape, screenshot, interact with pages.',   version: 'v1.5.0', rating: 4.7, source: 'Community',   installed: false, icon: '🌐', params: {} },
  { id: 'api-gateway',       name: 'API Gateway',        category: 'Development',  description: 'Route and proxy API calls with rate limiting and auth management.',     version: 'v1.2.0', rating: 4.5, source: 'ClawBot Core', installed: true,  icon: '🔌', params: {} },
]

// ── Initial logs (shown before Alfred logs load) ──────────────────────────────
export const initialLogs = [
  { id: 1, agent: 'System', agentId: null, level: 'info', message: 'Mission Control starting — connecting to Alfred server...', timestamp: new Date() },
  { id: 2, agent: 'System', agentId: null, level: 'info', message: 'Fetching state from ~/.openclaw/alfred/state.json',         timestamp: new Date() },
]
