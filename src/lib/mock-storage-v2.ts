import { PotV2, ContributionV2, Cycle, Tier } from './types-v2'

// Mock storage pour Cascade Cagnotte V2

// Données de démonstration V2
const mockPotV2: PotV2 = {
  id: 'demo-pot-v2',
  slug: 'demo123',
  name: 'Cagnotte de démonstration V2',
  objective_cents: 20000, // 200€
  fixed_amount_cents: 10000, // 100€ (compatibilité V1)
  ends_at: '2025-12-31T23:59:59.000Z',
  owner_token: 'demo-owner-token-123',
  pin: '1234',
  status: 'OPEN',
  created_at: '2024-01-01T00:00:00.000Z',
  
  // Nouvelles propriétés V2
  amount_mode: 'TIERS',
  frequency: 'RECURRING',
  tiers: [
    { amount_cents: 500, label: '5€' },
    { amount_cents: 1000, label: '10€' },
    { amount_cents: 2000, label: '20€' },
    { amount_cents: 5000, label: '50€' }
  ],
  solidarity_threshold_cents: 5000, // 50€
  solidarity_rate: 0.1, // 10%
  reserve_enabled: true,
  reserve_target_cents: 10000, // 100€
  reserve_balance_cents: 0,
  current_cycle: 1,
  cycle_duration_days: 30,
  
  // Calculs en temps réel
  total_collected_cents: 0,
  contributors_count: 0,
  estimated_refund_if_i_pay_now_cents: 0
}

const mockCycle: Cycle = {
  id: 'demo-cycle-1',
  pot_id: 'demo-pot-v2',
  cycle_number: 1,
  objective_cents: 20000,
  total_collected_cents: 0,
  surplus_deficit_cents: 0,
  reserve_used_cents: 0,
  reserve_added_cents: 0,
  contributors_count: 0,
  started_at: '2024-01-01T00:00:00.000Z',
  status: 'ACTIVE',
  created_at: '2024-01-01T00:00:00.000Z'
}

const mockContributionsV2: ContributionV2[] = [
  {
    id: 'demo-contrib-1',
    pot_id: 'demo-pot-v2',
    amount_cents: 2000, // Montant suggéré
    amount_paid_cents: 2000, // Montant réellement payé
    email: 'alice@example.com',
    display_name: 'Alice',
    is_anonymous: false,
    contrib_token: 'demo-contrib-1',
    stripe_session_id: 'mock_session_1',
    paid_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Il y a 2h
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    cycle_number: 1,
    tier_selected: '20€'
  },
  {
    id: 'demo-contrib-2',
    pot_id: 'demo-pot-v2',
    amount_cents: 1000,
    amount_paid_cents: 1000,
    email: 'bob@example.com',
    display_name: null,
    is_anonymous: true,
    contrib_token: 'demo-contrib-2',
    stripe_session_id: 'mock_session_2',
    paid_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Il y a 1h
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    cycle_number: 1,
    tier_selected: '10€'
  }
]

// Mise à jour des calculs en temps réel
function updatePotCalculations(pot: PotV2, contributions: ContributionV2[]): PotV2 {
  const cycleContributions = contributions.filter(c => c.cycle_number === pot.current_cycle)
  const totalCollected = cycleContributions.reduce((sum, c) => sum + c.amount_paid_cents, 0)
  const contributorsCount = cycleContributions.length
  
  // Calculer le remboursement estimé pour une nouvelle contribution
  const suggestedAmount = getSuggestedAmount(pot, contributorsCount)
  const estimatedRefund = calculateEstimatedRefund(pot, contributions, suggestedAmount, pot.current_cycle)
  
  return {
    ...pot,
    total_collected_cents: totalCollected,
    contributors_count: contributorsCount,
    estimated_refund_if_i_pay_now_cents: estimatedRefund
  }
}

// Fonctions d'import depuis les calculs V2
function getSuggestedAmount(pot: PotV2, currentContributors: number = 0): number {
  const { amount_mode, objective_cents, fixed_amount_cents, tiers } = pot
  
  switch (amount_mode) {
    case 'FIXED':
      return fixed_amount_cents
    case 'TIERS':
      if (tiers && tiers.length > 0) {
        const middleIndex = Math.floor(tiers.length / 2)
        return tiers[middleIndex].amount_cents
      }
      return fixed_amount_cents
    case 'FREE':
      const targetContributors = Math.max(currentContributors + 1, 1)
      return Math.max(Math.ceil(objective_cents / targetContributors), 10)
    default:
      return fixed_amount_cents
  }
}

function calculateEstimatedRefund(
  pot: PotV2,
  contributions: ContributionV2[],
  myContribution: number,
  cycle_number: number = 1
): number {
  const cycleContributions = contributions.filter(c => c.cycle_number === cycle_number)
  const totalCollected = cycleContributions.reduce((sum, c) => sum + c.amount_paid_cents, 0) + myContribution
  const objective = pot.objective_cents
  
  if (totalCollected <= objective) return 0
  
  const surplus = totalCollected - objective
  const totalContributors = cycleContributions.length + 1
  
  // Calcul simple pour l'estimation (sans solidarité pour simplifier)
  return Math.floor(surplus / totalContributors)
}

// Fonctions d'accès aux données
export function getMockPotV2(slug: string): PotV2 | null {
  if (slug === 'demo123') {
    return updatePotCalculations(mockPotV2, mockContributionsV2)
  }
  return null
}

export function getMockContributionsV2(slug: string): ContributionV2[] {
  if (slug === 'demo123') {
    return mockContributionsV2.map(contrib => ({
      ...contrib,
      display_name: contrib.is_anonymous ? `Anonyme #${contrib.id.slice(-4)}` : (contrib.display_name || 'Anonyme')
    }))
  }
  return []
}

export function getMockCycle(slug: string, cycleNumber: number = 1): Cycle | null {
  if (slug === 'demo123' && cycleNumber === 1) {
    const contributions = getMockContributionsV2(slug)
    const totalCollected = contributions.reduce((sum, c) => sum + c.amount_paid_cents, 0)
    
    return {
      ...mockCycle,
      total_collected_cents: totalCollected,
      contributors_count: contributions.length,
      surplus_deficit_cents: Math.max(0, totalCollected - mockCycle.objective_cents)
    }
  }
  return null
}

export function createMockContributionV2(data: {
  pot_id: string
  amount_cents: number
  amount_paid_cents: number
  email?: string
  display_name?: string
  is_anonymous?: boolean
  contrib_token: string
  stripe_session_id?: string
  paid_at: string
  cycle_number?: number
  tier_selected?: string
}): ContributionV2 {
  return {
    id: `mock-contrib-${Date.now()}`,
    pot_id: data.pot_id,
    amount_cents: data.amount_cents,
    amount_paid_cents: data.amount_paid_cents,
    email: data.email || null,
    display_name: data.display_name || null,
    is_anonymous: data.is_anonymous || false,
    contrib_token: data.contrib_token,
    stripe_session_id: data.stripe_session_id || null,
    paid_at: data.paid_at,
    created_at: data.paid_at,
    cycle_number: data.cycle_number || 1,
    tier_selected: data.tier_selected || null
  }
}

// Fonction pour ajouter une contribution au mock
export function addMockContributionV2(slug: string, contribution: ContributionV2): void {
  if (slug === 'demo123') {
    mockContributionsV2.push(contribution)
  }
}

// Fonction pour obtenir les paliers d'une cagnotte
export function getMockTiers(slug: string): Tier[] | null {
  if (slug === 'demo123') {
    return mockPotV2.tiers || null
  }
  return null
}

// Fonction pour valider un montant selon le mode
export function validateMockAmount(slug: string, amount_cents: number): { valid: boolean; error?: string } {
  const pot = getMockPotV2(slug)
  if (!pot) {
    return { valid: false, error: 'Cagnotte non trouvée' }
  }
  
  // Montant minimum
  if (amount_cents < 10) {
    return { valid: false, error: 'Le montant minimum est de 0,10 €' }
  }
  
  switch (pot.amount_mode) {
    case 'FIXED':
      if (amount_cents !== pot.fixed_amount_cents) {
        return { valid: false, error: `Le montant doit être de ${formatAmount(pot.fixed_amount_cents)}` }
      }
      break
      
    case 'TIERS':
      if (!pot.tiers || pot.tiers.length === 0) {
        return { valid: false, error: 'Aucun palier défini' }
      }
      const validTier = pot.tiers.find(tier => tier.amount_cents === amount_cents)
      if (!validTier) {
        const validAmounts = pot.tiers.map(t => formatAmount(t.amount_cents)).join(', ')
        return { valid: false, error: `Montant invalide. Valeurs acceptées : ${validAmounts}` }
      }
      break
      
    case 'FREE':
      // Pas de validation spécifique pour le mode libre
      break
  }
  
  return { valid: true }
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(cents / 100)
}
