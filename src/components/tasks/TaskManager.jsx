import React, { useEffect, useState } from 'react';

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const fetchTasks = () => {
    fetch('/api/tasks').then(r => r.json()).then(setTasks).catch(() => {});
  };

  useEffect(() => { fetchTasks(); }, []);

  const addTask = () => {
    if (!title.trim()) return;
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, status: 'pending' }),
    }).then(() => { setTitle(''); setDesc(''); fetchTasks(); });
  };

  const updateStatus = (id, status) => {
    fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(fetchTasks);
  };

  const deleteTask = (id) => {
    fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(fetchTasks);
  };

  const statusColors = { pending: '#f59e0b', 'in-progress': '#3B82F6', done: '#22c55e' };

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: '1rem', color: '#888' }}>Task Manager</h2>

      {/* Add task form */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Task title"
          style={{ flex: 1, padding: '8px 12px', background: '#111', border: '1px solid #333', borderRadius: 6, color: '#e0e0e0', fontFamily: 'inherit' }}
        />
        <input
          value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)"
          style={{ flex: 1, padding: '8px 12px', background: '#111', border: '1px solid #333', borderRadius: 6, color: '#e0e0e0', fontFamily: 'inherit' }}
        />
        <button onClick={addTask} style={{
          padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: 6,
          color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
        }}>Add</button>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div style={{ color: '#555' }}>No tasks yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: '#111', border: '1px solid #222', borderRadius: 8,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: statusColors[task.status] || '#555',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{task.title}</div>
                {task.description && <div style={{ fontSize: '0.8rem', color: '#888' }}>{task.description}</div>}
              </div>
              <select
                value={task.status}
                onChange={e => updateStatus(task.id, e.target.value)}
                style={{ background: '#0a0a0a', color: '#aaa', border: '1px solid #333', borderRadius: 4, padding: 4, fontFamily: 'inherit' }}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button onClick={() => deleteTask(task.id)} style={{
                background: 'none', border: '1px solid #333', borderRadius: 4,
                color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit',
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
