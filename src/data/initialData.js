// ── Skills ───────────────────────────────────────────────────────────────────
export const initialSkills = [
  { id: 'web-search',      name: 'Web Search',         category: 'Research',     description: 'Search the internet for real-time information and current events.',  version: 'v2.1.0', rating: 4.8, source: 'ClawBot Core', installed: true,  icon: '🔍', params: { maxResults: 10 } },
  { id: 'code-executor',   name: 'Code Executor',      category: 'Development',  description: 'Run Python, JavaScript and Bash scripts safely in a sandbox.',       version: 'v3.0.1', rating: 4.9, source: 'ClawBot Core', installed: true,  icon: '💻', params: { timeout: 30 } },
  { id: 'document-reader', name: 'Document Reader',    category: 'Productivity', description: 'Extract and analyse PDFs, Word docs, spreadsheets and more.',        version: 'v2.5.0', rating: 4.8, source: 'ClawBot Core', installed: true,  icon: '📄', params: {} },
  { id: 'social-publisher',name: 'Social Publisher',   category: 'Marketing',    description: 'Auto-publish content to Instagram, X, LinkedIn, TikTok.',            version: 'v1.8.0', rating: 4.7, source: 'Community',   installed: true,  icon: '📢', params: {} },
  { id: 'image-generator', name: 'Image Generator',    category: 'Creative',     description: 'Generate images via DALL-E 3 or Stable Diffusion XL.',               version: 'v1.5.0', rating: 4.6, source: 'Community',   installed: false, icon: '🎨', params: {} },
  { id: 'email-manager',   name: 'Email Manager',      category: 'Productivity', description: 'Read, send, and organise emails automatically via Gmail/Outlook.',   version: 'v2.0.0', rating: 4.3, source: 'Community',   installed: false, icon: '📧', params: {} },
  { id: 'seo-analyser',    name: 'SEO Analyser',       category: 'Marketing',    description: 'Analyse content for search engine optimisation and rankings.',        version: 'v1.2.0', rating: 4.5, source: 'Community',   installed: false, icon: '📈', params: {} },
  { id: 'data-analyser',   name: 'Data Visualiser',    category: 'Analytics',    description: 'Create charts and dashboards from any CSV or JSON data source.',     version: 'v2.3.0', rating: 4.4, source: 'Community',   installed: false, icon: '📊', params: {} },
  { id: 'voice-tts',       name: 'Voice / TTS',        category: 'Creative',     description: 'Convert text to speech in 20+ voices and languages.',                version: 'v1.0.0', rating: 4.2, source: 'Community',   installed: false, icon: '🔊', params: {} },
  { id: 'calendar-sync',   name: 'Calendar Sync',      category: 'Productivity', description: 'Two-way sync tasks and events with Google Calendar.',                version: 'v1.1.0', rating: 4.1, source: 'Community',   installed: false, icon: '📅', params: {} },
  { id: 'notion',          name: 'Notion Integration', category: 'Productivity', description: 'Read/write Notion databases and pages directly from agents.',        version: 'v1.4.0', rating: 4.6, source: 'Community',   installed: false, icon: '📝', params: {} },
  { id: 'twitter-monitor', name: 'Twitter Monitor',    category: 'Marketing',    description: 'Monitor keywords and trends, auto-reply or DM on trigger.',          version: 'v1.0.2', rating: 3.9, source: 'Community',   installed: false, icon: '🐦', params: {} },
  { id: 'file-manager',    name: 'File Manager',       category: 'Development',  description: 'Read, write, organize and manage files and directories.',            version: 'v1.3.0', rating: 4.5, source: 'ClawBot Core', installed: false, icon: '📁', params: {} },
  { id: 'api-connector',   name: 'API Connector',      category: 'Development',  description: 'Make HTTP requests to any REST or GraphQL API with authentication.', version: 'v2.1.0', rating: 4.7, source: 'ClawBot Core', installed: false, icon: '🔌', params: {} },
]

// ── Initial logs (shown before Alfred logs load) ──────────────────────────────
export const initialLogs = [
  { id: 1, agent: 'System', agentId: null, level: 'info', message: 'Mission Control starting — connecting to Alfred server...', timestamp: new Date() },
  { id: 2, agent: 'System', agentId: null, level: 'info', message: 'Fetching state from ~/.openclaw/alfred/state.json',         timestamp: new Date() },
]
