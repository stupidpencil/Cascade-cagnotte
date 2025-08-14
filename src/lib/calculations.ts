import { Pot, Contribution } from './supabase'

// Types pour les calculs de remboursement
export interface ContributionForRefund {
  id: string
  amount: number // en euros
  email?: string
}

export interface RefundResult {
  refunds: Array<{
    contribution_id: string
    email: string | null
    amount: number // en euros
  }>
  surplus: number // en euros
  per_person_before_rounding: number // en euros
}

/**
 * Calcule le remboursement estimé si on fermait maintenant après un nouveau paiement
 */
export function getEstimatedRefundIfIPayNow(
  pot: Pot,
  currentContributorsCount: number,
  currentTotalCollectedCents: number
): number {
  const collecteApres = currentTotalCollectedCents + pot.fixed_amount_cents
  const participantsApres = currentContributorsCount + 1
  
  // Pas de remboursement si l'objectif n'est pas atteint
  if (collecteApres <= pot.objective_cents) {
    return 0
  }
  
  const surplusApres = collecteApres - pot.objective_cents
  return Math.floor(surplusApres / participantsApres)
}

/**
 * Calcule le remboursement estimé pour l'état actuel (sans nouvelle contribution)
 */
export function getCurrentEstimatedRefund(
  pot: Pot,
  currentContributorsCount: number,
  currentTotalCollectedCents: number
): number {
  // Pas de remboursement si l'objectif n'est pas atteint
  if (currentTotalCollectedCents <= pot.objective_cents) {
    return 0
  }
  
  const surplus = currentTotalCollectedCents - pot.objective_cents
  return Math.floor(surplus / currentContributorsCount)
}

/**
 * Calcule le surplus actuel
 */
export function getCurrentSurplus(
  pot: Pot,
  totalCollectedCents: number
): number {
  return Math.max(0, totalCollectedCents - pot.objective_cents)
}

/**
 * Algorithme de répartition des remboursements avec arrondis garantis
 * Méthode "quotient + plus grands restes" pour garantir que Σ remboursements = surplus
 */
export function computeRefunds(
  contributions: ContributionForRefund[],
  objective: number, // en euros
  totalCollected: number // en euros
): RefundResult {
  const surplus = Math.max(0, totalCollected - objective)
  const surplusCents = Math.floor(surplus * 100)
  
  if (surplusCents === 0) {
    return {
      refunds: [],
      surplus,
      per_person_before_rounding: 0
    }
  }

  const N = contributions.length
  const base = Math.floor(surplusCents / N)
  let rest = surplusCents - base * N

  // Préparer les lignes de calcul
  const rows = contributions
    .map(c => ({
      id: c.id,
      email: c.email || null,
      paidCents: Math.floor(c.amount * 100),
      refundCents: 0
    }))
    .sort((a, b) => a.id.localeCompare(b.id)) // Tri déterministe

  // 1) Répartition de base
  for (const row of rows) {
    row.refundCents = Math.min(base, row.paidCents)
  }

  // 2) Répartition du reste centime par centime
  for (const row of rows) {
    if (rest === 0) break
    if (row.refundCents < row.paidCents) {
      row.refundCents += 1
      rest -= 1
    }
  }

  // 3) Si il reste encore du reste, deuxième passe (pratiquement inutile en montant fixe)
  if (rest > 0) {
    for (const row of rows) {
      if (rest === 0) break
      if (row.refundCents < row.paidCents) {
        row.refundCents += 1
        rest -= 1
      }
    }
  }

  const refunds = rows.map(row => ({
    contribution_id: row.id,
    email: row.email,
    amount: row.refundCents / 100
  }))

  const perPersonBeforeRounding = surplus / N

  return {
    refunds,
    surplus,
    per_person_before_rounding: perPersonBeforeRounding
  }
}

/**
 * Calcule le pourcentage de progression
 */
export function getProgressPercentage(
  collectedCents: number,
  objectiveCents: number
): number {
  if (objectiveCents === 0) return 100
  return Math.min(100, (collectedCents / objectiveCents) * 100)
}

/**
 * Calcule le temps restant jusqu'à la fin
 */
export function getTimeRemaining(endDate: string): {
  days: number
  hours: number
  minutes: number
  isExpired: boolean
} {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, isExpired: false }
}

/**
 * Formate un montant en centimes en euros
 */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100)
}

/**
 * Formate le temps restant
 */
export function formatTimeRemaining(endDate: string): string {
  const { days, hours, minutes, isExpired } = getTimeRemaining(endDate)
  
  if (isExpired) {
    return 'Terminé'
  }

  if (days > 0) {
    return `${days}j ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}
