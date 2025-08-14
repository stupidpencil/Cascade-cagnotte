'use client'

import { Frequency, FREQUENCIES } from '@/lib/types-v2'

interface FrequencySelectorProps {
  selectedFrequency: Frequency
  onFrequencyChange: (frequency: Frequency) => void
  cycleDurationDays: number
  onCycleDurationChange: (days: number) => void
  disabled?: boolean
}

export default function FrequencySelector({
  selectedFrequency,
  onFrequencyChange,
  cycleDurationDays,
  onCycleDurationChange,
  disabled = false
}: FrequencySelectorProps) {
  const getFrequencyDescription = (frequency: Frequency) => {
    switch (frequency) {
      case 'ONE_TIME':
        return 'Une seule contribution par personne, redistribution à la clôture'
      case 'RECURRING':
        return 'Contributions régulières avec cycles et redistribution périodique'
      default:
        return ''
    }
  }

  const getCycleDurationLabel = (days: number) => {
    switch (days) {
      case 7:
        return 'Hebdomadaire'
      case 14:
        return 'Bi-hebdomadaire'
      case 30:
        return 'Mensuel'
      case 90:
        return 'Trimestriel'
      case 180:
        return 'Semestriel'
      case 365:
        return 'Annuel'
      default:
        return `${days} jours`
    }
  }

  return (
    <div className="space-y-6">
      {/* Sélection de la fréquence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Fréquence de contribution
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FREQUENCIES.map((freqConfig) => (
            <button
              key={freqConfig.value}
              type="button"
              onClick={() => onFrequencyChange(freqConfig.value)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedFrequency === freqConfig.value
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">
                  {freqConfig.value === 'ONE_TIME' ? '🎯' : '🔄'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {freqConfig.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {freqConfig.description}
                  </p>
                </div>
                {selectedFrequency === freqConfig.value && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration des cycles (si récurrent) */}
      {selectedFrequency === 'RECURRING' && (
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Durée des cycles
          </label>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[7, 14, 30, 90, 180, 365].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onCycleDurationChange(days)}
                disabled={disabled}
                className={`
                  px-3 py-2 text-sm rounded-lg border transition-colors
                  ${cycleDurationDays === days
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {getCycleDurationLabel(days)}
              </button>
            ))}
          </div>

          {/* Durée personnalisée */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Ou durée personnalisée :</span>
            <input
              type="number"
              min="1"
              max="365"
              value={cycleDurationDays}
              onChange={(e) => {
                const days = parseInt(e.target.value)
                if (days >= 1 && days <= 365) {
                  onCycleDurationChange(days)
                }
              }}
              disabled={disabled}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">jours</span>
          </div>

          {/* Informations sur les cycles */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ À propos des cycles récurrents</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Chaque cycle a le même objectif</li>
              <li>• La redistribution se fait à la fin de chaque cycle</li>
              <li>• Les nouveaux contributeurs peuvent rejoindre à tout moment</li>
              <li>• Un ledger d'équité suit les soldes individuels</li>
            </ul>
          </div>
        </div>
      )}

      {/* Description de la fréquence sélectionnée */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">
          {selectedFrequency === 'ONE_TIME' ? 'Mode ponctuel' : 'Mode récurrent'}
        </h4>
        <p className="text-sm text-gray-600">
          {getFrequencyDescription(selectedFrequency)}
        </p>
      </div>
    </div>
  )
}
