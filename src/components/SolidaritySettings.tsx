'use client'

import { useState } from 'react'

interface SolidaritySettingsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  threshold_cents: number
  onThresholdChange: (threshold: number) => void
  rate: number
  onRateChange: (rate: number) => void
  disabled?: boolean
}

export default function SolidaritySettings({
  enabled,
  onEnabledChange,
  threshold_cents,
  onThresholdChange,
  rate,
  onRateChange,
  disabled = false
}: SolidaritySettingsProps) {
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(cents / 100)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1
    }).format(value)
  }

  const calculateExample = (contribution: number) => {
    if (!enabled || contribution <= threshold_cents) {
      return {
        contribution: contribution,
        above_threshold: 0,
        solidarity: 0,
        refundable: contribution
      }
    }

    const above_threshold = contribution - threshold_cents
    const solidarity = Math.floor(above_threshold * rate)
    const refundable = contribution - solidarity

    return {
      contribution,
      above_threshold,
      solidarity,
      refundable
    }
  }

  const exampleContribution = 10000 // 100€
  const example = calculateExample(exampleContribution)

  return (
    <div className="space-y-6">
      {/* Activation de la solidarité */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="solidarity-enabled"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="solidarity-enabled" className="text-sm font-medium text-gray-700">
          Activer le seuil de solidarité
        </label>
      </div>

      {enabled && (
        <>
          {/* Seuil de solidarité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seuil de solidarité
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={(threshold_cents / 100).toFixed(2)}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) * 100
                  if (amount >= 0) {
                    onThresholdChange(amount)
                  }
                }}
                disabled={disabled}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Au-delà de ce montant, une partie de la contribution n'est plus remboursable
            </p>
          </div>

          {/* Taux de solidarité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux de solidarité
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={rate}
                onChange={(e) => onRateChange(parseFloat(e.target.value))}
                disabled={disabled}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                {formatPercentage(rate)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pourcentage de la contribution au-delà du seuil qui alimente la redistribution
            </p>
          </div>

          {/* Exemple de calcul */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-3">💡 Exemple avec une contribution de {formatAmount(exampleContribution)}</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Contribution totale :</span>
                <span className="font-medium">{formatAmount(example.contribution)}</span>
              </div>
              
              {example.above_threshold > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Au-delà du seuil ({formatAmount(threshold_cents)}) :</span>
                    <span className="font-medium">{formatAmount(example.above_threshold)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contribution de solidarité ({formatPercentage(rate)}) :</span>
                    <span className="font-medium text-blue-600">{formatAmount(example.solidarity)}</span>
                  </div>
                </>
              )}
              
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-800 font-medium">Montant remboursable :</span>
                  <span className="font-bold text-green-600">{formatAmount(example.refundable)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explication du concept */}
          <div className="p-4 bg-amber-50 rounded-lg">
            <h4 className="text-sm font-medium text-amber-800 mb-2">🤝 Principe de solidarité</h4>
            <p className="text-sm text-amber-700">
              Le seuil de solidarité permet de favoriser l'équité en réduisant le remboursement des gros contributeurs 
              au profit des plus petits. Plus on contribue au-delà du seuil, plus on soutient collectivement le groupe.
            </p>
          </div>
        </>
      )}

      {!enabled && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Sans seuil de solidarité, tous les contributeurs reçoivent un remboursement proportionnel à leur contribution.
          </p>
        </div>
      )}
    </div>
  )
}
