'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'

interface FormData {
  name: string
  objective: number // en euros
  fixed_amount: number // en euros
  ends_at: string
  pin: string
}

interface CreateResponse {
  id: string
  slug: string
  publicUrl: string
  adminUrl: string
  ownerToken: string
}

export default function CreatePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<CreateResponse | null>(null)

  const [form, setForm] = useState<FormData>({
    name: '',
    objective: 0,
    fixed_amount: 0,
    ends_at: '',
    pin: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!form.name.trim()) {
      setError('Le nom de la cagnotte est requis')
      setIsLoading(false)
      return
    }

    if (form.objective <= 0) {
      setError('L\'objectif doit être supérieur à 0')
      setIsLoading(false)
      return
    }

    if (form.fixed_amount <= 0) {
      setError('Le montant fixe doit être supérieur à 0')
      setIsLoading(false)
      return
    }

    if (!form.ends_at) {
      setError('La date de fin est requise')
      setIsLoading(false)
      return
    }

    try {
      const requestData = {
        name: form.name.trim(),
        objective_cents: Math.round(form.objective * 100), // Convertir euros en centimes
        fixed_amount_cents: Math.round(form.fixed_amount * 100), // Convertir euros en centimes
        ends_at: form.ends_at,
        pin: form.pin || null,
      }

      const response = await fetch('/api/pots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Erreur lors de la création de la cagnotte'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // Si ce n'est pas du JSON, utiliser le texte brut
          errorMessage = errorText || errorMessage
        }
        
        setError(errorMessage)
        return
      }

      const data: CreateResponse = await response.json()
      setSuccess(data)
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Fonction pour formater l'affichage des montants
  const formatDisplayAmount = (cents: number): string => {
    if (cents === 0) return ''
    return (cents / 100).toString()
  }

  // Fonction pour parser les montants saisis
  const parseAmount = (value: string): number => {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🎉 Cagnotte créée avec succès !
              </h1>
              <p className="text-gray-600">
                Votre cagnotte "{success.slug}" est maintenant prête à recevoir des contributions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Lien public */}
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  📢 Lien public
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      URL publique
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={success.publicUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-green-300 rounded-l-md bg-green-50 text-green-900 text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(success.publicUrl)}
                        className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 transition-colors"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <QRCode value={success.publicUrl} size={128} />
                  </div>
                </div>
              </div>

              {/* Lien admin */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">
                  ⚙️ Administration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      URL d'administration
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={success.adminUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-l-md bg-blue-50 text-blue-900 text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(success.adminUrl)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Token propriétaire
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={success.ownerToken}
                        readOnly
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-l-md bg-blue-50 text-blue-900 text-sm font-mono"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(success.ownerToken)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <QRCode value={success.adminUrl} size={128} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => router.push(success.publicUrl)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Voir ma cagnotte
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Créer une cagnotte
            </h1>
            <p className="text-gray-600">
              Configurez votre cagnotte à montant fixe avec remboursement automatique
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom de la cagnotte */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la cagnotte *
              </label>
              <input
                type="text"
                id="name"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Ex: Cagnotte pour le cadeau de Marie"
                required
              />
            </div>

            {/* Objectif */}
            <div>
              <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-2">
                Objectif (€) *
              </label>
              <input
                type="number"
                id="objective"
                step="0.01"
                min="0"
                value={form.objective || ''}
                onChange={(e) => handleInputChange('objective', parseAmount(e.target.value))}
                className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Ex: 500"
                required
              />
            </div>

            {/* Montant fixe */}
            <div>
              <label htmlFor="fixed_amount" className="block text-sm font-medium text-gray-700 mb-2">
                Montant fixe (€) *
              </label>
              <input
                type="number"
                id="fixed_amount"
                step="0.01"
                min="0"
                value={form.fixed_amount || ''}
                onChange={(e) => handleInputChange('fixed_amount', parseAmount(e.target.value))}
                className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Ex: 50"
                required
              />
              <p className="mt-1 text-sm text-gray-700">
                C'est le montant unique payé par chaque contributeur. Si l'objectif est dépassé, un remboursement sera calculé à la clôture.
              </p>
            </div>

            {/* Date de fin */}
            <div>
              <label htmlFor="ends_at" className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="date"
                id="ends_at"
                value={form.ends_at}
                onChange={(e) => handleInputChange('ends_at', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Code PIN (optionnel) */}
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Code PIN (optionnel)
              </label>
              <input
                type="text"
                id="pin"
                value={form.pin}
                onChange={(e) => handleInputChange('pin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Code à 4 chiffres pour sécuriser l'admin"
                maxLength={4}
              />
              <p className="mt-1 text-sm text-gray-500">
                Code PIN pour sécuriser l'accès à l'administration de la cagnotte
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Création en cours...' : 'Créer la cagnotte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

