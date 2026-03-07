import React, { useState } from 'react'
import { X, Bot, Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'

const AGENT_TYPES = [
  { value: 'research',    label: '🔬 Research',    desc: 'Web search, data gathering, analysis' },
  { value: 'development', label: '💻 Development',  desc: 'Code execution, file management' },
  { value: 'analytics',   label: '📊 Analytics',   desc: 'Data processing, visualization' },
  { value: 'marketing',   label: '📢 Marketing',   desc: 'Social media, SEO, campaigns' },
  { value: 'creative',    label: '🎨 Creative',    desc: 'Image gen, content creation' },
]

const ICONS = ['🔬', '💻', '📊', '📢', '🎨', '🤖', '🦾', '⚙️', '🧠', '🔍']

export default function CreateAgentModal({ onClose }) {
  const addAgent = useStore((s) => s.addAgent)
  const skills = useStore((s) => s.skills)

  const [form, setForm] = useState({
    name: '',
    type: 'research',
    description: '',
    icon: '🤖',
    skills: [],
  })
  const [step, setStep] = useState(1)

  const installedSkills = skills.filter((s) => s.installed)

  const toggleSkill = (id) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(id)
        ? f.skills.filter((s) => s !== id)
        : [...f.skills, id],
    }))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    addAgent({
      name: form.name.trim(),
      type: form.type,
      description: form.description || 'Custom agent',
      icon: form.icon,
      skills: form.skills,
      status: 'offline',
      currentTask: null,
      color: '#64748b',
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-mc-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Bot size={16} className="text-amber-400" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-mc-text">Create New Agent</div>
              <div className="text-[11px] text-mc-muted">Step {step} of 2</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-4 gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1">
              <div
                className="h-1 rounded-full transition-all"
                style={{ background: step >= s ? '#f59e0b' : '#1a2744' }}
              />
              <div className={`text-[10px] mt-1 ${step >= s ? 'text-amber-400' : 'text-mc-subtle'}`}>
                {s === 1 ? 'Basic Info' : 'Skills'}
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">
                Agent Name *
              </label>
              <input
                className="mc-input"
                placeholder="e.g. ResearchBot Zeta"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Icon */}
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setForm((f) => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-lg text-lg transition-all border ${
                      form.icon === icon
                        ? 'bg-amber-500/20 border-amber-500/40'
                        : 'bg-mc-panel border-mc-border hover:border-mc-borderLight'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">
                Agent Type
              </label>
              <div className="space-y-1.5">
                {AGENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-all ${
                      form.type === t.value
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-mc-panel border-mc-border hover:border-mc-borderLight'
                    }`}
                  >
                    <span className="text-base">{t.label.split(' ')[0]}</span>
                    <div>
                      <div className="text-[12px] font-medium text-mc-text">{t.label.split(' ')[1]}</div>
                      <div className="text-[10px] text-mc-muted">{t.desc}</div>
                    </div>
                    {form.type === t.value && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide block mb-1.5">
                Description (optional)
              </label>
              <textarea
                className="mc-input resize-none"
                rows={2}
                placeholder="Describe what this agent does..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-5">
            <div className="text-[11px] font-semibold text-mc-muted uppercase tracking-wide mb-3">
              Assign Skills ({form.skills.length} selected)
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {installedSkills.length === 0 ? (
                <div className="text-center py-6 text-mc-muted text-sm">
                  No installed skills. Install skills from the ClaWHub first.
                </div>
              ) : (
                installedSkills.map((skill) => {
                  const selected = form.skills.includes(skill.id)
                  return (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-all ${
                        selected
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-mc-panel border-mc-border hover:border-mc-borderLight'
                      }`}
                    >
                      <span className="text-base">{skill.icon}</span>
                      <div className="flex-1">
                        <div className="text-[12px] font-medium text-mc-text">{skill.name}</div>
                        <div className="text-[10px] text-mc-muted">{skill.category} · {skill.version}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          selected ? 'bg-amber-500 border-amber-500' : 'border-mc-borderLight'
                        }`}
                      >
                        {selected && <span className="text-black text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-mc-border">
          <button
            className="btn-secondary"
            onClick={() => step === 1 ? onClose() : setStep(1)}
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <button
            className="btn-primary"
            disabled={step === 1 && !form.name.trim()}
            onClick={() => step === 1 ? setStep(2) : handleSubmit()}
            style={{ opacity: step === 1 && !form.name.trim() ? 0.5 : 1 }}
          >
            {step === 1 ? 'Next →' : (
              <>
                <Plus size={13} />
                Create Agent
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
