import React, { useState } from 'react';
import Workspace from './components/workspace/Workspace.jsx';
import TaskManager from './components/tasks/TaskManager.jsx';

export default function App() {
  const [tab, setTab] = useState('workspace');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e0e0e0' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid #222',
      }}>
        <h1 style={{ fontSize: '1.2rem', color: '#3B82F6' }}>OPENCLAW Mission Control</h1>
        <nav style={{ display: 'flex', gap: 12 }}>
          {['workspace', 'tasks'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', border: '1px solid #333', borderRadius: 4,
              background: tab === t ? '#3B82F6' : 'transparent',
              color: tab === t ? '#fff' : '#888', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.85rem',
            }}>
              {t === 'workspace' ? 'Workspace' : 'Tasks'}
            </button>
          ))}
        </nav>
      </header>
      <main style={{ padding: 24 }}>
        {tab === 'workspace' ? <Workspace /> : <TaskManager />}
      </main>
    </div>
  );
}
