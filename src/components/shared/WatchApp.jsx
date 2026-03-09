/**
 * WatchApp — statut du repo ~/watch-portfolio-tracker
 * Bouton "Demander à Balthazar de continuer" → crée une tâche assignée
 */
import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Plus } from 'lucide-react'

export default function WatchApp() {
  const [repoStatus, setRepoStatus] = useState(null)
  const [creating,   setCreating]   = useState(false)
  const [created,    setCreated]    = useState(null)

  useEffect(() => {
    // Check repo existence via health (we can't do FS directly, just show static info)
    setRepoStatus('unknown')
  }, [])

  const createTask = async () => {
    setCreating(true)
    try {
      const r = await fetch('/api/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:          'Continuer le développement de watch-portfolio-tracker',
          description:    'Reprendre et améliorer le projet ~/watch-portfolio-tracker — analyser l\'état actuel, corriger les bugs, ajouter les fonctionnalités manquantes.',
          priority:       'high',
          category:       'code',
          assignedTo:     'balthazar',
          assignedToName: 'Balthazar',
        }),
      })
      const task = await r.json()
      setCreated(task)
    } catch (e) {
      alert('Erreur: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>⌚</span>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Watch App</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a6080' }}>~/watch-portfolio-tracker</div>
        </div>
      </div>

      <div style={{ background: '#0d111a', border: '1px solid #1a2236', padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a6080', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Statut du projet
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
          <div>📁 Repo: <span style={{ color: '#c8d8e8' }}>~/watch-portfolio-tracker</span></div>
          <div>🤖 Assigné à: <span style={{ color: '#8b5cf6' }}>💻 Balthazar</span></div>
          <div>📊 Stack: <span style={{ color: '#c8d8e8' }}>Node.js · React · Portfolio tracker</span></div>
        </div>
      </div>

      {created ? (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} color="#22c55e" />
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22c55e', fontWeight: 700 }}>Tâche créée ✓</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a6080', marginTop: 2 }}>
              L&apos;orchestrateur va l&apos;assigner à Balthazar et exécuter au prochain cycle.
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={createTask}
          disabled={creating}
          style={{
            width: '100%', padding: '12px 20px',
            background: creating ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6',
            fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: creating ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Plus size={14} />
          {creating ? 'Création...' : '💻 Demander à Balthazar de continuer'}
        </button>
      )}

      <div style={{ marginTop: 20, fontFamily: 'monospace', fontSize: 10, color: '#2a3a50', lineHeight: 1.8 }}>
        La tâche sera automatiquement traitée par l&apos;orchestrateur au prochain cycle (toutes les 5 min).
        Balthazar recevra le contexte et produira un plan d&apos;action concret.
      </div>
    </div>
  )
}
