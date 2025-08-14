import { 
  PotV2, 
  ContributionV2, 
  Cycle, 
  RedistributionResult, 
  CycleClosureResult,
  SolidarityCalculation,
  Tier
} from './types-v2'

// Calculs V2 pour Cascade Cagnotte

/**
 * Calcule le montant suggéré selon le mode de la cagnotte
 */
export function getSuggestedAmount(pot: PotV2, currentContributors: number = 0): number {
  const { amount_mode, objective_cents, fixed_amount_cents } = pot
  
  switch (amount_mode) {
    case 'FIXED':
      return fixed_amount_cents
      
    case 'TIERS':
      // Retourne le palier du milieu par défaut
      if (pot.tiers && pot.tiers.length > 0) {
        const middleIndex = Math.floor(pot.tiers.length / 2)
        return pot.tiers[middleIndex].amount_cents
      }
      return fixed_amount_cents
      
    case 'FREE':
      // Suggestion basée sur l'objectif et le nombre de contributeurs
      const targetContributors = Math.max(currentContributors + 1, 1)
      return Math.max(Math.ceil(objective_cents / targetContributors), 10) // Minimum 10 centimes
      
    default:
      return fixed_amount_cents
  }
}

/**
 * Valide un montant selon le mode de la cagnotte
 */
export function validateAmount(pot: PotV2, amount_cents: number): { valid: boolean; error?: string } {
  const { amount_mode, tiers } = pot
  
  // Montant minimum
  if (amount_cents < 10) {
    return { valid: false, error: 'Le montant minimum est de 0,10 €' }
  }
  
  switch (amount_mode) {
    case 'FIXED':
      if (amount_cents !== pot.fixed_amount_cents) {
        return { valid: false, error: `Le montant doit être de ${formatAmount(pot.fixed_amount_cents)}` }
      }
      break
      
    case 'TIERS':
      if (!tiers || tiers.length === 0) {
        return { valid: false, error: 'Aucun palier défini' }
      }
      const validTier = tiers.find(tier => tier.amount_cents === amount_cents)
      if (!validTier) {
        const validAmounts = tiers.map(t => formatAmount(t.amount_cents)).join(', ')
        return { valid: false, error: `Montant invalide. Valeurs acceptées : ${validAmounts}` }
      }
      break
      
    case 'FREE':
      // Pas de validation spécifique pour le mode libre
      break
  }
  
  return { valid: true }
}

/**
 * Calcule la contribution de solidarité
 */
export function calculateSolidarity(
  amount_paid_cents: number,
  threshold_cents: number,
  rate: number
): SolidarityCalculation {
  const contribution_above_threshold = Math.max(0, amount_paid_cents - threshold_cents)
  const solidarity_amount = Math.floor(contribution_above_threshold * rate)
  const refundable_amount = amount_paid_cents - solidarity_amount
  
  return {
    threshold_cents,
    rate,
    contribution_above_threshold,
    solidarity_amount,
    refundable_amount
  }
}

/**
 * Calcule la redistribution pour un cycle ou une cagnotte ponctuelle
 */
export function calculateRedistribution(
  pot: PotV2,
  contributions: ContributionV2[],
  cycle_number: number = 1
): RedistributionResult[] {
  const cycleContributions = contributions.filter(c => c.cycle_number === cycle_number)
  
  if (cycleContributions.length === 0) {
    return []
  }
  
  const totalCollected = cycleContributions.reduce((sum, c) => sum + c.amount_paid_cents, 0)
  const objective = pot.objective_cents
  
  // Si pas de surplus, pas de redistribution
  if (totalCollected <= objective) {
    return cycleContributions.map(contrib => ({
      contribution_id: contrib.id,
      amount_paid_cents: contrib.amount_paid_cents,
      refund_amount_cents: 0,
      final_cost_cents: contrib.amount_paid_cents,
      solidarity_contribution_cents: 0
    }))
  }
  
  const surplus = totalCollected - objective
  
  // Appliquer la réserve si activée
  let availableForRedistribution = surplus
  let reserveUsed = 0
  
  if (pot.reserve_enabled && pot.reserve_target_cents) {
    const reserveNeeded = pot.reserve_target_cents - pot.reserve_balance_cents
    if (reserveNeeded > 0) {
      reserveUsed = Math.min(surplus, reserveNeeded)
      availableForRedistribution = surplus - reserveUsed
    }
  }
  
  // Calculer les montants remboursables (après solidarité)
  const refundableAmounts = cycleContributions.map(contrib => {
    if (pot.solidarity_threshold_cents && pot.solidarity_rate) {
      const solidarity = calculateSolidarity(
        contrib.amount_paid_cents,
        pot.solidarity_threshold_cents,
        pot.solidarity_rate
      )
      return {
        contribution_id: contrib.id,
        amount_paid_cents: contrib.amount_paid_cents,
        refundable_amount: solidarity.refundable_amount,
        solidarity_contribution: solidarity.solidarity_amount
      }
    } else {
      return {
        contribution_id: contrib.id,
        amount_paid_cents: contrib.amount_paid_cents,
        refundable_amount: contrib.amount_paid_cents,
        solidarity_contribution: 0
      }
    }
  })
  
  const totalRefundable = refundableAmounts.reduce((sum, item) => sum + item.refundable_amount, 0)
  
  // Redistribution proportionnelle
  const results: RedistributionResult[] = []
  
  if (totalRefundable > 0) {
    // Algorithme "quotient + plus gros restes"
    const baseRefund = Math.floor(availableForRedistribution / totalRefundable)
    const remainder = availableForRedistribution % totalRefundable
    
    // Trier par montant refundable croissant pour donner la priorité aux plus petits
    const sortedItems = [...refundableAmounts].sort((a, b) => a.refundable_amount - b.refundable_amount)
    
    sortedItems.forEach((item, index) => {
      const extraRefund = index < remainder ? 1 : 0
      const refundAmount = Math.min(
        item.refundable_amount * baseRefund + extraRefund,
        item.refundable_amount
      )
      
      results.push({
        contribution_id: item.contribution_id,
        amount_paid_cents: item.amount_paid_cents,
        refund_amount_cents: refundAmount,
        final_cost_cents: item.amount_paid_cents - refundAmount,
        solidarity_contribution_cents: item.solidarity_contribution
      })
    })
  } else {
    // Pas de montant remboursable, pas de redistribution
    refundableAmounts.forEach(item => {
      results.push({
        contribution_id: item.contribution_id,
        amount_paid_cents: item.amount_paid_cents,
        refund_amount_cents: 0,
        final_cost_cents: item.amount_paid_cents,
        solidarity_contribution_cents: item.solidarity_contribution
      })
    })
  }
  
  return results
}

/**
 * Calcule le résultat de clôture d'un cycle
 */
export function calculateCycleClosure(
  pot: PotV2,
  cycle: Cycle,
  contributions: ContributionV2[]
): CycleClosureResult {
  const cycleContributions = contributions.filter(c => c.cycle_number === cycle.cycle_number)
  const redistributions = calculateRedistribution(pot, contributions, cycle.cycle_number)
  
  const totalSurplus = Math.max(0, cycle.total_collected_cents - cycle.objective_cents)
  const totalSolidarity = redistributions.reduce((sum, r) => sum + r.solidarity_contribution_cents, 0)
  
  // Calculer le nouveau solde de réserve
  let reserveBalanceAfter = pot.reserve_balance_cents
  if (pot.reserve_enabled && pot.reserve_target_cents) {
    const reserveNeeded = pot.reserve_target_cents - pot.reserve_balance_cents
    if (reserveNeeded > 0 && totalSurplus > 0) {
      const reserveAdded = Math.min(totalSurplus, reserveNeeded)
      reserveBalanceAfter += reserveAdded
    }
  }
  
  return {
    cycle,
    redistributions,
    reserve_balance_after: reserveBalanceAfter,
    total_surplus: totalSurplus,
    total_solidarity: totalSolidarity
  }
}

/**
 * Calcule le remboursement estimé si je contribue maintenant
 */
export function calculateEstimatedRefund(
  pot: PotV2,
  contributions: ContributionV2[],
  myContribution: number,
  cycle_number: number = 1
): number {
  // Créer une contribution temporaire pour le calcul
  const tempContribution: ContributionV2 = {
    id: 'temp',
    pot_id: pot.id,
    amount_cents: myContribution,
    amount_paid_cents: myContribution,
    contrib_token: 'temp',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_anonymous: false,
    cycle_number
  }
  
  const allContributions = [...contributions, tempContribution]
  const redistributions = calculateRedistribution(pot, allContributions, cycle_number)
  
  const myRedistribution = redistributions.find(r => r.contribution_id === 'temp')
  return myRedistribution ? myRedistribution.refund_amount_cents : 0
}

/**
 * Calcule la durée du cycle en jours
 */
export function getCycleDurationDays(frequency: string, customDays?: number): number {
  if (customDays) return customDays
  
  switch (frequency) {
    case 'RECURRING':
      return 30 // Mensuel par défaut
    case 'ONE_TIME':
      return 30 // 30 jours par défaut
    default:
      return 30
  }
}

/**
 * Calcule la date de fin du cycle actuel
 */
export function getCurrentCycleEndDate(pot: PotV2): Date {
  if (pot.frequency === 'ONE_TIME') {
    return new Date(pot.ends_at)
  }
  
  // Pour récurrent, calculer basé sur le cycle actuel
  const cycleStart = new Date(pot.created_at)
  const cycleEnd = new Date(cycleStart)
  cycleEnd.setDate(cycleEnd.getDate() + (pot.cycle_duration_days || 30) * pot.current_cycle)
  
  return cycleEnd
}

/**
 * Formate un montant en centimes en euros
 */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(cents / 100)
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1
  }).format(value)
}

/**
 * Vérifie si un cycle peut être clôturé
 */
export function canCloseCycle(pot: PotV2, cycle: Cycle): boolean {
  if (pot.frequency !== 'RECURRING') return false
  if (cycle.status === 'CLOSED') return false
  
  const cycleEndDate = getCurrentCycleEndDate(pot)
  return new Date() >= cycleEndDate
}

/**
 * Calcule les statistiques d'un cycle
 */
export function getCycleStats(cycle: Cycle, contributions: ContributionV2[]): {
  totalCollected: number
  objective: number
  surplus: number
  contributorsCount: number
  averageContribution: number
  progressPercentage: number
} {
  const cycleContributions = contributions.filter(c => c.cycle_number === cycle.cycle_number)
  const totalCollected = cycleContributions.reduce((sum, c) => sum + c.amount_paid_cents, 0)
  const surplus = Math.max(0, totalCollected - cycle.objective_cents)
  const averageContribution = cycleContributions.length > 0 
    ? Math.round(totalCollected / cycleContributions.length) 
    : 0
  const progressPercentage = Math.min((totalCollected / cycle.objective_cents) * 100, 100)
  
  return {
    totalCollected,
    objective: cycle.objective_cents,
    surplus,
    contributorsCount: cycleContributions.length,
    averageContribution,
    progressPercentage
  }
}
