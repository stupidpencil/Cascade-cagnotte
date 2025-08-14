'use client'

import { formatAmount } from '@/lib/calculations'

interface Contribution {
  id: string
  amount_cents: number
  display_name: string
  is_anonymous: boolean
  paid_at: string
}

interface SegmentedProgressBarProps {
  contributions: Contribution[]
  objective_cents: number
  total_collected_cents: number
}

export default function SegmentedProgressBar({ 
  contributions, 
  objective_cents, 
  total_collected_cents 
}: SegmentedProgressBarProps) {
  if (contributions.length === 0) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div className="bg-gray-300 h-4 rounded-full flex items-center justify-center text-xs text-gray-600">
          Aucune contribution
        </div>
      </div>
    )
  }

  let currentPosition = 0
  const segments = contributions.map((contrib, index) => {
    // Calculer la largeur en fonction du total collecté pour que tous les segments soient visibles
    const segmentWidth = (contrib.amount_cents / total_collected_cents) * 100
    const segmentStart = currentPosition
    
    // Générer une couleur unique pour chaque contribution
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-yellow-500',
      'bg-red-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500'
    ]
    const segmentColor = colors[index % colors.length]
    
    currentPosition += segmentWidth
    
    return {
      ...contrib,
      segmentWidth,
      segmentStart,
      segmentColor
    }
  })

  // Calculer la position de l'objectif en pourcentage du total collecté
  const objectivePosition = (objective_cents / total_collected_cents) * 100

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`absolute h-full ${segment.segmentColor} transition-all duration-300 hover:opacity-80 cursor-pointer`}
            style={{
              left: `${segment.segmentStart}%`,
              width: `${segment.segmentWidth}%`
            }}
            title={`${segment.display_name} - ${formatAmount(segment.amount_cents)} - ${new Date(segment.paid_at).toLocaleString('fr-FR')}`}
          />
        ))}
        
        {/* Marqueur de l'objectif */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${Math.min(objectivePosition, 100)}%` }}
          title={`Objectif: ${formatAmount(objective_cents)}`}
        />
      </div>
    </div>
  )
}
