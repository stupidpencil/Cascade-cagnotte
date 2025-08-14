'use client'

import { useState } from 'react'
import { Tier } from '@/lib/types-v2'

interface TiersSelectorProps {
  tiers: Tier[]
  onTiersChange: (tiers: Tier[]) => void
  disabled?: boolean
}

export default function TiersSelector({ 
  tiers, 
  onTiersChange, 
  disabled = false 
}: TiersSelectorProps) {
  const [newTierAmount, setNewTierAmount] = useState('')
  const [newTierLabel, setNewTierLabel] = useState('')

  const addTier = () => {
    const amount = parseFloat(newTierAmount) * 100 // Convertir en centimes
    if (amount >= 10 && newTierLabel.trim()) {
      const newTier: Tier = {
        amount_cents: amount,
        label: newTierLabel.trim()
      }
      
      // Vérifier que le montant n'existe pas déjà
      if (!tiers.find(t => t.amount_cents === amount)) {
        const updatedTiers = [...tiers, newTier].sort((a, b) => a.amount_cents - b.amount_cents)
        onTiersChange(updatedTiers)
        setNewTierAmount('')
        setNewTierLabel('')
      }
    }
  }

  const removeTier = (index: number) => {
    const updatedTiers = tiers.filter((_, i) => i !== index)
    onTiersChange(updatedTiers)
  }

  const updateTier = (index: number, field: keyof Tier, value: string | number) => {
    const updatedTiers = [...tiers]
    if (field === 'amount_cents') {
      updatedTiers[index] = { ...updatedTiers[index], amount_cents: value as number }
    } else {
      updatedTiers[index] = { ...updatedTiers[index], label: value as string }
    }
    onTiersChange(updatedTiers.sort((a, b) => a.amount_cents - b.amount_cents))
  }

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(cents / 100)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Paliers de contribution
        </label>
        
        {/* Liste des paliers existants */}
        <div className="space-y-3 mb-4">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <input
                  type="text"
                  value={(tier.amount_cents / 100).toFixed(2)}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') return
                    const numValue = parseFloat(value)
                    if (!isNaN(numValue) && numValue >= 0.10) {
                      const amount = Math.round(numValue * 100)
                      updateTier(index, 'amount_cents', amount)
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value
                    if (value === '' || parseFloat(value) < 0.10) {
                      updateTier(index, 'amount_cents', 1000) // 10€ par défaut
                    }
                  }}
                  disabled={disabled}
                  className="input-field"
                  placeholder="0.00"
                />
                <span className="text-sm text-gray-500 ml-2">€</span>
              </div>
              
              <div className="flex-1">
                <input
                  type="text"
                  value={tier.label}
                  onChange={(e) => updateTier(index, 'label', e.target.value)}
                  disabled={disabled}
                  placeholder="Label du palier"
                  className="input-field"
                />
              </div>
              
              <button
                type="button"
                onClick={() => removeTier(index)}
                disabled={disabled}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Ajout d'un nouveau palier */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ajouter un palier</h4>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={newTierAmount}
                onChange={(e) => setNewTierAmount(e.target.value)}
                disabled={disabled}
                placeholder="Montant"
                className="input-field"
              />
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                value={newTierLabel}
                onChange={(e) => setNewTierLabel(e.target.value)}
                disabled={disabled}
                placeholder="Label (ex: 5€, 10€, 20€)"
                className="input-field"
              />
            </div>
            
            <button
              type="button"
              onClick={addTier}
              disabled={disabled || !newTierAmount || !newTierLabel.trim() || parseFloat(newTierAmount) < 0.10}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Aperçu des paliers */}
        {tiers.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Aperçu des paliers :</h4>
            <div className="flex flex-wrap gap-2">
              {tiers.map((tier, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {tier.label} ({formatAmount(tier.amount_cents)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
