'use client'

import { formatAmount } from '@/lib/calculations'

interface Contribution {
  id: string
  amount_cents: number
  display_name: string
  is_anonymous: boolean
  paid_at: string
}

interface ContributorsListProps {
  contributions: Contribution[]
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'À l\'instant'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  } else {
    return date.toLocaleDateString('fr-FR')
  }
}

export default function ContributorsList({ contributions }: ContributorsListProps) {
  if (contributions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          👥 Contributeurs
        </h2>
        <div className="text-center text-gray-500 py-8">
          Aucune contribution pour le moment
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        👥 Contributeurs ({contributions.length})
      </h2>
      
      <div className="space-y-3">
        {contributions.map((contrib, index) => {
          // Générer la même couleur que dans la barre de progression
          const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
            'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-yellow-500',
            'bg-red-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500'
          ]
          const colorClass = colors[index % colors.length]
          
          return (
            <div 
              key={contrib.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${colorClass} text-white rounded-full flex items-center justify-center text-sm font-semibold`}>
                  {index + 1}
                </div>
              <div>
                <div className="font-medium text-gray-900">
                  {contrib.display_name}
                  {contrib.is_anonymous && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Anonyme
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500" title={new Date(contrib.paid_at).toLocaleString('fr-FR')}>
                  {formatRelativeTime(contrib.paid_at)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {formatAmount(contrib.amount_cents)}
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* Total */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Total collecté</span>
          <span className="font-bold text-xl text-blue-600">
            {formatAmount(contributions.reduce((sum, c) => sum + c.amount_cents, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
