'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { formatAmount } from '@/lib/calculations'

interface ContributionData {
  contribution_id: string
  amount_cents: number
  estimated_refund_at_payment_time_cents: number
  contrib_token: string
  email?: string
}

export default function ThanksPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const sessionId = searchParams.get('session_id')

  const [contribution, setContribution] = useState<ContributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchContributionData = async () => {
      try {
        // Récupérer d'abord les données de la cagnotte pour avoir le montant fixe
        const potResponse = await fetch(`/api/pots/${slug}`)
        if (!potResponse.ok) {
          throw new Error('Erreur lors de la récupération des données de la cagnotte')
        }
        
        const potData = await potResponse.json()
        
        // Simuler les données de contribution basées sur le session_id
        // En mode réel, on récupérerait ces données depuis la base de données
        const mockContributionData = {
          contribution_id: `mock_${Date.now()}`,
          amount_cents: potData.fixed_amount_cents, // Utiliser le vrai montant fixe
          estimated_refund_at_payment_time_cents: 0, // Sera calculé correctement
          contrib_token: `mock_token_${Date.now()}`,
          email: 'contributeur@example.com',
        }
        
        // Calculer le remboursement estimé basé sur l'état actuel de la cagnotte
        const currentTotal = potData.total_collected_cents
        const currentContributors = potData.contributors_count
        
        // Calculer le remboursement estimé pour l'état actuel (sans la nouvelle contribution)
        let estimatedRefund = 0
        if (currentTotal > potData.objective_cents) {
          const surplus = currentTotal - potData.objective_cents
          estimatedRefund = Math.floor(surplus / currentContributors)
        }
        
        mockContributionData.estimated_refund_at_payment_time_cents = estimatedRefund
        
        setContribution(mockContributionData)
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement des données de contribution')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchContributionData()
    } else {
      setError('Session ID manquant')
      setLoading(false)
    }
  }, [sessionId, slug])

  // Calculer le coût final (montant payé - remboursement estimé)
  const finalCostCents = contribution 
    ? contribution.amount_cents - contribution.estimated_refund_at_payment_time_cents
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !contribution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error || 'Contribution non trouvée'}</p>
          <a
            href={`/c/${slug}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Retour à la cagnotte
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête avec confettis */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Merci pour votre contribution !
          </h1>
          <p className="text-xl text-gray-700">
            Votre contribution a été enregistrée avec succès.
          </p>
        </div>

        {/* Blocs principaux - Structure hiérarchisée */}
        <div className="space-y-8">
          {/* Ligne 1: Contribution confirmée + Coût final */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bloc 1: Contribution confirmée */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-green-300">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Contribution confirmée
                </h2>
                <p className="text-gray-600 text-lg">
                  Votre paiement a été traité avec succès
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold text-lg">Montant payé :</span>
                  <span className="text-gray-900 font-bold text-2xl">{formatAmount(contribution.amount_cents)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold text-lg">Date :</span>
                  <span className="text-gray-900 font-bold text-xl">{new Date().toLocaleDateString('fr-FR')}</span>
                </div>
                {contribution.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold text-lg">Email :</span>
                    <span className="text-gray-900 font-bold text-lg">{contribution.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bloc 2: Votre coût final */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-300">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">💰</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Votre coût final
                </h2>
                <p className="text-gray-600 text-lg">
                  Montant que vous paierez réellement
                </p>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-blue-600 mb-3">
                  {formatAmount(finalCostCents)}
                </div>
                <p className="text-gray-600 text-xl font-medium">
                  au lieu de {formatAmount(contribution.amount_cents)}
                </p>
              </div>
              
              {contribution.estimated_refund_at_payment_time_cents > 0 ? (
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <div className="text-center">
                    <p className="text-green-800 font-bold text-lg mb-2">
                      🎉 Remboursement estimé
                    </p>
                    <p className="text-green-600 font-bold text-2xl">
                      {formatAmount(contribution.estimated_refund_at_payment_time_cents)}
                    </p>
                    <p className="text-green-700 text-sm mt-2">
                      Confirmé à la clôture
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="text-center">
                    <p className="text-gray-800 font-bold text-lg">
                      Aucun remboursement prévu
                    </p>
                    <p className="text-gray-600 text-sm mt-2">
                      Objectif non atteint
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ligne 2: Lien de vérification (plus large) */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-300">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔗</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Lien de vérification
              </h2>
              <p className="text-gray-600 text-lg">
                Conservez ce lien pour vérifier votre contribution
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={`${window.location.origin}/c/${slug}?token=${contribution.contrib_token}`}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 text-gray-900 text-base font-mono rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/c/${slug}?token=${contribution.contrib_token}`)
                  // Feedback visuel temporaire
                  const button = event?.target as HTMLButtonElement
                  if (button) {
                    const originalText = button.textContent
                    button.textContent = 'Copié !'
                    button.className = 'px-6 py-3 bg-green-500 text-white font-bold rounded-lg transition-all duration-200 hover:bg-green-600 text-lg whitespace-nowrap'
                    setTimeout(() => {
                      button.textContent = originalText
                      button.className = 'px-6 py-3 bg-purple-600 text-white font-bold rounded-lg transition-all duration-200 hover:bg-purple-700 text-lg whitespace-nowrap'
                    }, 2000)
                  }
                }}
                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg transition-all duration-200 hover:bg-purple-700 text-lg whitespace-nowrap"
              >
                Copier le lien
              </button>
            </div>
          </div>

          {/* Actions principales */}
          <div className="flex flex-col sm:flex-row gap-6">
            <a
              href={`/c/${slug}`}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-5 px-8 rounded-xl text-center transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center">
                <span className="text-2xl mr-3">🏠</span>
                <span className="text-xl">Retour à la cagnotte</span>
              </div>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`)
                // Feedback visuel temporaire
                const button = event?.target as HTMLButtonElement
                if (button) {
                  const originalText = button.innerHTML
                  button.innerHTML = '<span class="text-2xl mr-3">✅</span><span class="text-xl">Lien copié !</span>'
                  button.className = 'flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-5 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl'
                  setTimeout(() => {
                    button.innerHTML = originalText
                    button.className = 'flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-5 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl'
                  }, 2000)
                }
              }}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-5 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center">
                <span className="text-2xl mr-3">📤</span>
                <span className="text-xl">Partager la cagnotte</span>
              </div>
            </button>
          </div>
        </div>

        {/* Note importante - Plus d'espace autour */}
        <div className="mt-16 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl shadow-lg p-8">
          <div className="flex items-start">
            <div className="text-4xl mr-6">💡</div>
            <div className="text-amber-800">
              <p className="font-bold text-2xl mb-4">Informations importantes :</p>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start">
                  <span className="text-amber-600 mr-3 text-xl">•</span>
                  <span>Votre contribution sera visible sur la page de la cagnotte</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-3 text-xl">•</span>
                  <span>Si l'objectif est dépassé, un remboursement sera calculé à la clôture</span>
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-3 text-xl">•</span>
                  <span>Conservez le lien de vérification pour toute question</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
