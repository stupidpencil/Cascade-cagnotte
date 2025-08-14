'use client'

import { useState } from 'react'

interface ReserveSettingsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  target_cents: number
  onTargetChange: (target: number) => void
  disabled?: boolean
}

export default function ReserveSettings({
  enabled,
  onEnabledChange,
  target_cents,
  onTargetChange,
  disabled = false
}: ReserveSettingsProps) {
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(cents / 100)
  }

  return (
    <div className="space-y-6">
      {/* Activation de la réserve */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="reserve-enabled"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="reserve-enabled" className="text-sm font-medium text-gray-700">
          Activer la réserve commune
        </label>
      </div>

      {enabled && (
        <>
          {/* Cible de la réserve */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cible de la réserve
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={(target_cents / 100).toFixed(2)}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) * 100
                  if (amount >= 0) {
                    onTargetChange(amount)
                  }
                }}
                disabled={disabled}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Montant que la réserve doit atteindre avant redistribution
            </p>
          </div>

          {/* Explication du fonctionnement */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-3">🏦 Fonctionnement de la réserve</h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-medium text-green-800">En cas de surplus :</span>
                  <p className="text-green-700 mt-1">
                    L'excédent alimente d'abord la réserve jusqu'à sa cible, puis le reste est redistribué.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-medium text-green-800">En cas de déficit :</span>
                  <p className="text-green-700 mt-1">
                    La réserve peut être utilisée pour compenser le déficit avant d'ajuster les contributions.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-medium text-green-800">Stabilité :</span>
                  <p className="text-green-700 mt-1">
                    La réserve amortit les variations entre les cycles et assure une meilleure stabilité.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exemple concret */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-3">💡 Exemple concret</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Objectif du cycle :</span>
                <span className="font-medium">{formatAmount(20000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total collecté :</span>
                <span className="font-medium">{formatAmount(25000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Surplus :</span>
                <span className="font-medium text-green-600">{formatAmount(5000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cible de réserve :</span>
                <span className="font-medium">{formatAmount(target_cents)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-800 font-medium">Versé à la réserve :</span>
                  <span className="font-bold text-blue-600">{formatAmount(Math.min(5000, target_cents))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-800 font-medium">Redistribué :</span>
                  <span className="font-bold text-green-600">{formatAmount(Math.max(0, 5000 - target_cents))}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!enabled && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Sans réserve commune</h4>
          <p className="text-sm text-gray-600">
            Tous les surplus et déficits sont directement redistribués entre les contributeurs sans amortissement.
          </p>
        </div>
      )}
    </div>
  )
}
