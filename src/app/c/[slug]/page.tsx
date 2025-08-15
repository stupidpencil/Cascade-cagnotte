'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { formatAmount, formatTimeRemaining, getProgressPercentage } from '@/lib/calculations'
import SegmentedProgressBar from '@/components/SegmentedProgressBar'
import ContributorsList from '@/components/ContributorsList'

interface Pot {
  id: string
  slug: string
  name: string
  objective_cents: number
  fixed_amount_cents: number
  ends_at: string
  status: 'OPEN' | 'CLOSED'
  closed_at: string | null
  total_collected_cents: number
  contributors_count: number
  estimated_refund_if_i_pay_now_cents: number
  current_surplus_cents: number
  
  // Champs V2
  amount_mode?: 'FIXED' | 'TIERS' | 'FREE'
  frequency?: 'ONE_TIME' | 'RECURRING'
  tiers?: Array<{ amount_cents: number; label: string }>
  solidarity_threshold_cents?: number
  solidarity_rate?: number
  reserve_enabled?: boolean
  reserve_target_cents?: number
  reserve_balance_cents?: number
  current_cycle?: number
  cycle_duration_days?: number
}

interface ContributionResponse {
  contribution_id: string
  amount_cents: number
  estimated_refund_at_payment_time_cents: number
  checkout_url: string
  contrib_token: string
}

export default function PotPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const ownerToken = searchParams.get('owner')
  const token = searchParams.get('token')

  const [pot, setPot] = useState<Pot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contributing, setContributing] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [contributionData, setContributionData] = useState<any>(null)
  const [contributions, setContributions] = useState<any[]>([])
  
  // États pour l'interface adaptative
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [freeAmount, setFreeAmount] = useState('')

  useEffect(() => {
    fetchPot()
    fetchContributions()
    
    // Si un token de vérification est présent, récupérer les données de contribution
    if (token) {
      setVerificationToken(token)
      fetchContributionData(token)
    }
  }, [slug, token])

  // Rafraîchir les données toutes les 5 secondes pour voir les mises à jour
  useEffect(() => {
    if (!pot) return
    
    const interval = setInterval(() => {
      fetchPot()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [pot])

  const fetchPot = async (retryCount = 0) => {
    try {
      console.log(`Fetching pot data for slug: ${slug} (attempt ${retryCount + 1})`)
      
      // Utiliser une URL absolue pour éviter les problèmes de réseau
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/pots/${slug}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Ajouter des options pour améliorer la robustesse
        cache: 'no-cache',
        credentials: 'same-origin',
      })
      
      console.log(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error: ${response.status} - ${errorText}`)
        
        // Si c'est une erreur 404 et qu'on n'a pas encore retry, on attend un peu et on réessaie
        if (response.status === 404 && retryCount < 2) {
          console.log(`Pot not found, retrying in 1 second... (attempt ${retryCount + 1})`)
          setTimeout(() => fetchPot(retryCount + 1), 1000)
          return
        }
        
        throw new Error(`Cagnotte non trouvée (${response.status})`)
      }
      
      const data = await response.json()
      console.log('Pot data received:', data)
      setPot(data)
      setIsAdmin(!!ownerToken)
    } catch (err) {
      console.error('Error fetching pot:', err)
      
      // Gestion spécifique des erreurs réseau
      if (err instanceof TypeError && err.message.includes('NetworkError')) {
        setError('Erreur de connexion réseau. Veuillez vérifier votre connexion et réessayer.')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la cagnotte')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchContributions = async () => {
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/pots/${slug}/contributions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
        credentials: 'same-origin',
      })
      if (response.ok) {
        const data = await response.json()
        setContributions(data.contributions || [])
      }
    } catch (err) {
      console.error('Error fetching contributions:', err)
    }
  }

  const fetchContributionData = async (contribToken: string) => {
    try {
      // Pour l'instant, on simule la récupération des données de contribution
      // TODO: Créer une vraie API pour récupérer les données par token
      const mockContributionData = {
        contribution_id: `mock_${Date.now()}`,
        amount_cents: pot?.fixed_amount_cents || 0,
        paid_at: new Date().toISOString(),
        email: 'contributeur@example.com',
        contrib_token: contribToken,
      }
      setContributionData(mockContributionData)
    } catch (err) {
      console.error('Error fetching contribution data:', err)
    }
  }

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pot) return

    // Validation du montant selon le mode
    const contributionAmount = getContributionAmount()
    if (contributionAmount <= 0) {
      setError('Veuillez sélectionner un montant valide pour contribuer.')
      return
    }

    if (pot.amount_mode === 'TIERS' && !selectedTier) {
      setError('Veuillez sélectionner un palier de contribution.')
      return
    }

    if (pot.amount_mode === 'FREE' && (!freeAmount || parseFloat(freeAmount) < 0.10)) {
      setError('Le montant minimum est de 0.10€.')
      return
    }

    setContributing(true)
    setError('') // Clear previous errors
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/pots/${slug}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email || null,
          display_name: displayName || null,
          is_anonymous: isAnonymous,
          amount_cents: getContributionAmount(),
          tier_selected: pot.amount_mode === 'TIERS' && selectedTier ? selectedTier.toString() : undefined
        }),
        cache: 'no-cache',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Contribution API Error: ${response.status} - ${errorText}`)
        
        let errorMessage = 'Erreur lors de la contribution'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // Si on ne peut pas parser le JSON, on utilise le texte brut
          if (response.status === 404) {
            errorMessage = 'Cagnotte non trouvée. Veuillez rafraîchir la page et réessayer.'
          } else {
            errorMessage = `Erreur ${response.status}: ${errorText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      const data: ContributionResponse = await response.json()
      
      // Rediriger vers la page de remerciement
      window.location.href = data.checkout_url
    } catch (err) {
      console.error('Contribution error:', err)
      
      // Gestion spécifique des erreurs réseau
      if (err instanceof TypeError && err.message.includes('NetworkError')) {
        setError('Erreur de connexion réseau lors de la contribution. Veuillez vérifier votre connexion et réessayer.')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors de la contribution')
      }
    } finally {
      setContributing(false)
    }
  }

  const handleClose = async () => {
    if (!pot || !ownerToken) return

    setClosing(true)
    try {
      const response = await fetch(`/api/pots/${slug}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ owner_token: ownerToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la clôture')
      }

      const data = await response.json()
      setShowCloseModal(false)
      // Recharger les données de la cagnotte
      await fetchPot()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la clôture')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !pot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cagnotte non trouvée</h1>
          <p className="text-gray-600 mb-4">{error || 'Cette cagnotte n\'existe pas ou a été supprimée.'}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  const progressPercentage = pot ? getProgressPercentage(pot.total_collected_cents, pot.objective_cents) : 0
  const isObjectiveReached = pot ? pot.total_collected_cents >= pot.objective_cents : false
  const isClosed = pot ? pot.status === 'CLOSED' : false

  // Fonctions utilitaires pour l'interface adaptative
  const getContributionAmount = (): number => {
    if (!pot) return 0
    
    switch (pot.amount_mode) {
      case 'FIXED':
        return pot.fixed_amount_cents
      case 'TIERS':
        return selectedTier || (pot.tiers && pot.tiers.length > 0 ? pot.tiers[0].amount_cents : pot.fixed_amount_cents)
      case 'FREE':
        const amount = parseFloat(freeAmount) * 100
        return isNaN(amount) ? (pot.fixed_amount_cents || 2000) : Math.max(amount, 10) // Minimum 0.10€
      default:
        return pot.fixed_amount_cents
    }
  }

  const getSuggestedAmount = (): number => {
    if (!pot) return 0
    
    // Pour le mode FREE, utiliser le montant suggéré ou le montant fixe par défaut
    if (pot.amount_mode === 'FREE') {
      return pot.fixed_amount_cents || 2000 // 20€ par défaut
    }
    
    return getContributionAmount()
  }

  // Initialiser le montant libre avec la suggestion
  useEffect(() => {
    if (pot && pot.amount_mode === 'FREE' && !freeAmount) {
      setFreeAmount(formatAmount(getSuggestedAmount()))
    }
    if (pot && pot.amount_mode === 'TIERS' && selectedTier === null && pot.tiers && pot.tiers.length > 0) {
      setSelectedTier(pot.tiers[0].amount_cents)
    }
  }, [pot, freeAmount, selectedTier])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Concept reminder */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-center font-medium">
            💰 Une cagnotte où chacun paie la même somme à la fin, même si l'objectif est dépassé
          </p>
        </div>

        {/* En-tête */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{pot ? pot.name : 'Chargement...'}</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
              >
                Partager
              </button>
              <div className="p-2 bg-gray-100 rounded-md">
                <QRCode value={window.location.href} size={32} />
              </div>
            </div>
          </div>

          {/* Bandeau de statut */}
          {isClosed && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <span className="text-green-600 text-lg mr-2">✅</span>
                <span className="text-green-800 font-medium">Cagnotte clôturée</span>
              </div>
            </div>
          )}

          {isObjectiveReached && !isClosed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">🎉</span>
                <span className="text-yellow-800 font-medium">Objectif atteint 🎉</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Les prochaines contributions réduisent la part de chacun.
              </p>
            </div>
          )}

          {/* Barre de progression segmentée */}
          {pot && (
            <div className="mb-6">
              <SegmentedProgressBar
                contributions={contributions}
                objective_cents={pot.objective_cents}
                total_collected_cents={pot.total_collected_cents}
              />
            </div>
          )}

          {/* Statistiques */}
          {pot && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">{pot.contributors_count}</div>
                <div className="text-sm text-gray-700 font-medium">Contributeurs</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatAmount(pot.total_collected_cents)}</div>
                <div className="text-sm text-gray-700 font-medium">Collecté</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatAmount(pot.objective_cents)}</div>
                <div className="text-sm text-gray-700 font-medium">d'objectif</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {pot.total_collected_cents > pot.objective_cents 
                    ? formatAmount(pot.total_collected_cents - pot.objective_cents)
                    : '0,00 €'
                  }
                </div>
                <div className="text-sm text-gray-700 font-medium">de surplus</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">{formatTimeRemaining(pot.ends_at)}</div>
                <div className="text-sm text-gray-700 font-medium">temps restant</div>
              </div>
            </div>
          )}
        </div>

        {/* Section de vérification de contribution */}
        {verificationToken && contributionData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">
              ✅ Vérification de votre contribution
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-green-700 mb-2">Montant payé :</p>
                <p className="text-lg font-semibold text-green-900">{formatAmount(contributionData.amount_cents)}</p>
              </div>
              <div>
                <p className="text-sm text-green-700 mb-2">Date de paiement :</p>
                <p className="text-lg font-semibold text-green-900">
                  {new Date(contributionData.paid_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {contributionData.email && (
                <div>
                  <p className="text-sm text-green-700 mb-2">Email :</p>
                  <p className="text-lg font-semibold text-green-900">{contributionData.email}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-green-700 mb-2">Token de contribution :</p>
                <p className="text-sm font-mono text-green-900 bg-green-100 p-2 rounded">
                  {contributionData.contrib_token}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Statut :</strong> Contribution confirmée et enregistrée dans la cagnotte.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Colonne gauche - Formulaire de contribution */}
          <div className="space-y-6">
            {/* Formulaire de contribution */}
            {pot && !isClosed && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  💳 Contribuer à cette cagnotte
                </h2>
                <form onSubmit={handleContribute} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                      Votre nom ou pseudo
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="Laisser vide pour rester anonyme"
                      disabled={isAnonymous}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAnonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isAnonymous" className="ml-2 block text-sm text-gray-700">
                      Ne pas afficher mon nom dans la liste
                    </label>
                  </div>

                  {/* Interface adaptative selon le mode de contribution */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant de contribution
                    </label>
                    
                    {pot?.amount_mode === 'FIXED' && (
                      <div>
                        <input
                          type="text"
                          value={formatAmount(pot.fixed_amount_cents)}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-400 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed text-xl font-bold text-center"
                        />
                        <p className="text-sm text-gray-700 mt-2 font-medium">
                          Montant fixe pour cette cagnotte
                        </p>
                      </div>
                    )}
                    
                    {pot?.amount_mode === 'TIERS' && pot.tiers && (
                      <div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {pot.tiers.map((tier, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedTier(tier.amount_cents)}
                              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                                selectedTier === tier.amount_cents
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              <div className="text-xl font-bold">{formatAmount(tier.amount_cents)}</div>
                              <div className="text-sm text-gray-600">{tier.label}</div>
                            </button>
                          ))}
                        </div>
                        {selectedTier && (
                          <p className="text-sm text-gray-700 font-medium">
                            Montant sélectionné : {formatAmount(selectedTier)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {pot?.amount_mode === 'FREE' && (
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.10"
                          value={freeAmount}
                          onChange={(e) => setFreeAmount(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-400 rounded-md bg-white text-gray-900 text-xl font-bold text-center"
                          placeholder="20.00"
                        />
                        <p className="text-sm text-gray-700 mt-2 font-medium">
                          Montant libre (minimum 0.10€)
                        </p>
                      </div>
                    )}
                    
                    {/* Mode par défaut (FIXED) si amount_mode n'est pas défini */}
                    {!pot?.amount_mode && (
                      <div>
                        <input
                          type="text"
                          value={pot ? formatAmount(pot.fixed_amount_cents) : ''}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-400 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed text-xl font-bold text-center"
                        />
                        <p className="text-sm text-gray-700 mt-2 font-medium">
                          Montant fixe pour cette cagnotte
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message informatif */}
                  <div className="p-4 rounded-lg text-sm">
                    {pot && pot.total_collected_cents < pot.objective_cents ? (
                      <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded-lg p-4">
                        <p className="font-medium">Aucun remboursement prévu pour le moment.</p>
                        <p className="text-blue-700 mt-1">
                          L'objectif n'est pas encore atteint. Votre contribution sera de {formatAmount(getContributionAmount())}.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg p-4">
                        <p className="font-medium">Un remboursement partiel sera effectué à parts égales à la clôture.</p>
                        <p className="text-green-700 mt-1">
                          L'objectif est atteint ! Vous pourriez recevoir un remboursement.
                        </p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-red-800 mb-3">{error}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setLoading(true)
                          fetchPot()
                        }}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded border border-red-300 transition-colors"
                      >
                        Réessayer
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={contributing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                  >
                    {contributing ? 'Contribution en cours...' : 'Contribuer'}
                  </button>
                </form>
              </div>
            )}

            {/* Bloc admin */}
            {isAdmin && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  ⚙️ Administration
                </h3>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Collecté :</span>
                    <span className="font-medium">{pot ? formatAmount(pot.total_collected_cents) : '...'}</span>
                  </div>
                  {pot && pot.current_surplus_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">Surplus actuel :</span>
                      <span className="font-medium text-green-600">{formatAmount(pot.current_surplus_cents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-blue-700">Remboursement estimé :</span>
                    <span className="font-medium">{pot ? formatAmount(pot.estimated_refund_if_i_pay_now_cents) : '...'}</span>
                  </div>
                </div>

                {!isClosed && (
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                  >
                    Clôturer la cagnotte
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Colonne droite - Coût final et contributeurs */}
          <div className="space-y-6">
            {/* Coût final estimé */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                💰 Coût final estimé
              </h2>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-blue-600">
                  {formatAmount(pot.fixed_amount_cents - pot.estimated_refund_if_i_pay_now_cents)}
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {pot.estimated_refund_if_i_pay_now_cents > 0 ? (
                  "Ce montant représente votre coût final après remboursement estimé. Le montant réel sera confirmé à la clôture."
                ) : (
                  "Votre contribution sera de {formatAmount(pot.fixed_amount_cents)}. Aucun remboursement prévu pour le moment."
                )}
              </p>
              {pot.estimated_refund_if_i_pay_now_cents > 0 && (
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800 text-center">
                    <strong>Remboursement estimé :</strong> {formatAmount(pot.estimated_refund_if_i_pay_now_cents)}
                  </p>
                </div>
              )}
            </div>

            {/* Liste des contributeurs */}
            <ContributorsList contributions={contributions} />
          </div>
        </div>
      </div>

      {/* Modale de clôture */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmer la clôture
            </h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir clôturer cette cagnotte ? Cette action est irréversible.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleClose}
                disabled={closing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                {closing ? 'Clôture...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
