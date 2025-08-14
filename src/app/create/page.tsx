'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AmountModeSelector from '@/components/AmountModeSelector'
import TiersSelector from '@/components/TiersSelector'
import FrequencySelector from '@/components/FrequencySelector'
import SolidaritySettings from '@/components/SolidaritySettings'
import ReserveSettings from '@/components/ReserveSettings'
import { 
  AmountMode, 
  Frequency, 
  Tier, 
  CreatePotRequestV2 
} from '@/lib/types-v2'

export default function CreatePage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Champs de base
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [pin, setPin] = useState('')

  // Nouvelles propriétés V2
  const [amountMode, setAmountMode] = useState<AmountMode>('FIXED')
  const [tiers, setTiers] = useState<Tier[]>([
    { amount_cents: 500, label: '5€' },
    { amount_cents: 1000, label: '10€' },
    { amount_cents: 2000, label: '20€' }
  ])
  const [frequency, setFrequency] = useState<Frequency>('ONE_TIME')
  const [cycleDurationDays, setCycleDurationDays] = useState(30)
  
  // Paramètres de solidarité
  const [solidarityEnabled, setSolidarityEnabled] = useState(false)
  const [solidarityThreshold, setSolidarityThreshold] = useState(5000) // 50€
  const [solidarityRate, setSolidarityRate] = useState(0.1) // 10%
  
  // Paramètres de réserve
  const [reserveEnabled, setReserveEnabled] = useState(false)
  const [reserveTarget, setReserveTarget] = useState(10000) // 100€

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      // Validation
      if (!name.trim()) throw new Error('Le nom de la cagnotte est requis')
      if (!objective || parseFloat(objective) <= 0) throw new Error('L\'objectif doit être supérieur à 0')
      if (!fixedAmount || parseFloat(fixedAmount) <= 0) throw new Error('Le montant fixe doit être supérieur à 0')
      if (!endsAt) throw new Error('La date de fin est requise')

      // Validation spécifique au mode
      if (amountMode === 'TIERS' && tiers.length === 0) {
        throw new Error('Au moins un palier doit être défini')
      }

      const request: CreatePotRequestV2 = {
        name: name.trim(),
        objective_cents: Math.round(parseFloat(objective) * 100),
        fixed_amount_cents: Math.round(parseFloat(fixedAmount) * 100),
        ends_at: endsAt + 'T23:59:59.000Z',
        pin: pin.trim() || undefined,
        
        // Nouvelles propriétés V2
        amount_mode: amountMode,
        frequency,
        tiers: amountMode === 'TIERS' ? tiers : undefined,
        solidarity_threshold_cents: solidarityEnabled ? solidarityThreshold : undefined,
        solidarity_rate: solidarityEnabled ? solidarityRate : undefined,
        reserve_enabled: reserveEnabled,
        reserve_target_cents: reserveEnabled ? reserveTarget : undefined,
        cycle_duration_days: frequency === 'RECURRING' ? cycleDurationDays : undefined
      }

      const response = await fetch('/api/pots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création')
      }

      const data = await response.json()
      
      // Redirection vers la page de la cagnotte
      router.push(`/c/${data.slug}?owner=${data.ownerToken}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setCreating(false)
    }
  }

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(cents / 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎯 Créer une cagnotte V2
          </h1>
          <p className="text-xl text-gray-700">
            Configurez votre cagnotte avec les nouvelles fonctionnalités de Cascade
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informations de base */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              📝 Informations de base
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm text-gray-800 font-semibold mb-2">
                  Nom de la cagnotte *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-600 font-medium focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Cagnotte pour le cadeau de Marie"
                  required
                />
              </div>

              <div>
                <label htmlFor="objective" className="block text-sm text-gray-800 font-semibold mb-2">
                  Objectif (€) *
                </label>
                <input
                  type="number"
                  id="objective"
                  step="0.01"
                  min="0.01"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-600 font-medium focus:outline-none focus:border-blue-500"
                  placeholder="200.00"
                  required
                />
              </div>

              <div>
                <label htmlFor="fixedAmount" className="block text-sm text-gray-800 font-semibold mb-2">
                  Montant fixe (€) *
                </label>
                <input
                  type="number"
                  id="fixedAmount"
                  step="0.01"
                  min="0.01"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-600 font-medium focus:outline-none focus:border-blue-500"
                  placeholder="20.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Montant de référence pour les calculs
                </p>
              </div>

              <div>
                <label htmlFor="endsAt" className="block text-sm text-gray-800 font-semibold mb-2">
                  Date de fin *
                </label>
                <input
                  type="date"
                  id="endsAt"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-600 font-medium focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="pin" className="block text-sm text-gray-800 font-semibold mb-2">
                  Code PIN (optionnel)
                </label>
                <input
                  type="text"
                  id="pin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-600 font-medium focus:outline-none focus:border-blue-500"
                  placeholder="1234"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Code de sécurité pour la clôture
                </p>
              </div>
            </div>
          </div>

          {/* Mode de contribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              💰 Mode de contribution
            </h2>
            
            <AmountModeSelector
              selectedMode={amountMode}
              onModeChange={setAmountMode}
              disabled={creating}
            />

            {/* Configuration des paliers */}
            {amountMode === 'TIERS' && (
              <div className="mt-6 border-t pt-6">
                <TiersSelector
                  tiers={tiers}
                  onTiersChange={setTiers}
                  disabled={creating}
                />
              </div>
            )}
          </div>

          {/* Fréquence */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              🔄 Fréquence de contribution
            </h2>
            
            <FrequencySelector
              selectedFrequency={frequency}
              onFrequencyChange={setFrequency}
              cycleDurationDays={cycleDurationDays}
              onCycleDurationChange={setCycleDurationDays}
              disabled={creating}
            />
          </div>

          {/* Paramètres avancés */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              ⚙️ Paramètres avancés
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Solidarité */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">🤝 Seuil de solidarité</h3>
                <SolidaritySettings
                  enabled={solidarityEnabled}
                  onEnabledChange={setSolidarityEnabled}
                  threshold_cents={solidarityThreshold}
                  onThresholdChange={setSolidarityThreshold}
                  rate={solidarityRate}
                  onRateChange={setSolidarityRate}
                  disabled={creating}
                />
              </div>

              {/* Réserve */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">🏦 Réserve commune</h3>
                <ReserveSettings
                  enabled={reserveEnabled}
                  onEnabledChange={setReserveEnabled}
                  target_cents={reserveTarget}
                  onTargetChange={setReserveTarget}
                  disabled={creating}
                />
              </div>
            </div>
          </div>

          {/* Résumé de la configuration */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              📋 Résumé de votre configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Mode de contribution :</span>
                <span className="ml-2 text-blue-700">
                  {amountMode === 'FIXED' && 'Montant fixe unique'}
                  {amountMode === 'TIERS' && `${tiers.length} paliers disponibles`}
                  {amountMode === 'FREE' && 'Montant libre'}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-blue-800">Fréquence :</span>
                <span className="ml-2 text-blue-700">
                  {frequency === 'ONE_TIME' ? 'Ponctuel' : `Récurrent (${cycleDurationDays} jours)`}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-blue-800">Solidarité :</span>
                <span className="ml-2 text-blue-700">
                  {solidarityEnabled 
                    ? `Activée (seuil: ${formatAmount(solidarityThreshold)}, taux: ${(solidarityRate * 100).toFixed(0)}%)`
                    : 'Désactivée'
                  }
                </span>
              </div>
              
              <div>
                <span className="font-medium text-blue-800">Réserve :</span>
                <span className="ml-2 text-blue-700">
                  {reserveEnabled 
                    ? `Activée (cible: ${formatAmount(reserveTarget)})`
                    : 'Désactivée'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Bouton de création */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              {creating ? 'Création en cours...' : 'Créer la cagnotte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

