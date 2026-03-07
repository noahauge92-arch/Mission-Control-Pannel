import React from 'react'
import { Construction } from 'lucide-react'

export default function ComingSoon({ view }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Construction size={40} className="text-mc-border mx-auto mb-4" />
        <div className="text-mc-muted text-sm capitalize">{view} — coming soon</div>
      </div>
    </div>
  )
}
