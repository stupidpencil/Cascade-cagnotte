// Stockage temporaire pour le mode mock
interface MockPot {
  id: string
  slug: string
  name: string
  objective_cents: number
  fixed_amount_cents: number
  ends_at: string
  owner_token: string
  pin: string | null
  status: 'OPEN' | 'CLOSED'
  closed_at: string | null
  created_at: string
}

interface MockContribution {
  id: string
  pot_id: string
  amount_cents: number
  email: string | null
  display_name: string | null
  is_anonymous: boolean
  contrib_token: string
  stripe_session_id: string | null
  paid_at: string
  created_at: string
}

interface MockRefund {
  id: string
  contribution_id: string
  pot_id: string
  amount_cents: number
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  stripe_refund_id: string | null
  processed_at: string | null
  failure_reason: string | null
  created_at: string
}

// Stockage en mémoire (se vide au redémarrage)
const mockPots = new Map<string, MockPot>()
const mockContributions = new Map<string, MockContribution>()
const mockRefunds = new Map<string, MockRefund>()

// Initialiser avec des données de démonstration
const demoPot: MockPot = {
  id: 'demo-id',
  slug: 'demo123',
  name: 'Cagnotte de démonstration',
  objective_cents: 20000, // 200€ (encore plus bas pour tester le remboursement)
  fixed_amount_cents: 10000, // 100€ fixe
  ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  owner_token: 'demo_owner_token_123',
  pin: null,
  status: 'OPEN',
  closed_at: null,
  created_at: new Date().toISOString(),
}

// Ajouter la cagnotte demo et ses contributions
mockPots.set('demo123', demoPot)

const demoContributions: MockContribution[] = [
  {
    id: 'demo_contrib_1',
    pot_id: 'demo-id',
    amount_cents: 10000,
    email: 'demo1@example.com',
    display_name: 'Alice',
    is_anonymous: false,
    contrib_token: 'demo_contrib_1',
    stripe_session_id: null,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo_contrib_2',
    pot_id: 'demo-id',
    amount_cents: 10000,
    email: 'demo2@example.com',
    display_name: 'Bob',
    is_anonymous: false,
    contrib_token: 'demo_contrib_2',
    stripe_session_id: null,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo_contrib_3',
    pot_id: 'demo-id',
    amount_cents: 10000,
    email: 'demo3@example.com',
    display_name: null,
    is_anonymous: true,
    contrib_token: 'demo_contrib_3',
    stripe_session_id: null,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
]

demoContributions.forEach(contrib => {
  mockContributions.set(contrib.id, contrib)
})

export function getMockPot(slug: string): MockPot | null {
  console.log(`Recherche cagnotte: ${slug}`)
  console.log(`=== DEBUG STORAGE ===`)
  console.log(`Cagnottes stockées: [ ${Array.from(mockPots.keys()).join(', ')} ]`)
  Array.from(mockPots.entries()).forEach(([key, pot]) => {
    console.log(`- ${key}: ${pot.name} (ID: ${pot.id}, Montant: ${pot.fixed_amount_cents})`)
  })
  console.log(`Contributions stockées: ${mockContributions.size}`)
  console.log(`=====================`)
  
  const pot = mockPots.get(slug)
  if (pot) {
    console.log(`Cagnotte trouvée: ${slug} Montant collecté: ${getMockTotalCollected(slug)}`)
  } else {
    console.log(`Cagnotte non trouvée: ${slug}`)
  }
  return pot || null
}

export function createMockPot(potData: Omit<MockPot, 'id' | 'created_at'>): MockPot {
  console.log(`Cagnotte ajoutée au stockage: ${potData.slug}`)
  const newPot: MockPot = {
    ...potData,
    id: `mock_${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  
  mockPots.set(potData.slug, newPot)
  console.log(`Cagnotte créée: ${potData.slug} ID: ${newPot.id}`)
  
  return newPot
}

export function createMockContribution(contributionData: Omit<MockContribution, 'id' | 'created_at'>): MockContribution {
  const newContribution: MockContribution = {
    ...contributionData,
    id: `mock_contrib_${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  
  mockContributions.set(newContribution.id, newContribution)
  console.log(`Contribution créée avec pot_id: ${contributionData.pot_id}`)
  
  return newContribution
}

export function getMockContributionsCount(potSlug: string): number {
  const pot = mockPots.get(potSlug)
  if (!pot) return 0
  
  const count = Array.from(mockContributions.values()).filter(
    c => c.pot_id === pot.id
  ).length
  
  console.log(`Debug: Cagnotte ${potSlug}, pot_id: ${pot.id}`)
  console.log(`Debug: Contributions trouvées: ${count}`)
  Array.from(mockContributions.values())
    .filter(c => c.pot_id === pot.id)
    .forEach(c => {
      console.log(`Debug: Contribution ${c.id}: ${c.amount_cents} centimes`)
    })
  
  return count
}

export function getMockTotalCollected(potSlug: string): number {
  const pot = mockPots.get(potSlug)
  if (!pot) return 0
  
  const total = Array.from(mockContributions.values())
    .filter(c => c.pot_id === pot.id)
    .reduce((total, c) => total + c.amount_cents, 0)
  
  console.log(`Debug: Cagnotte ${potSlug}, pot_id: ${pot.id}`)
  console.log(`Debug: Total collecté: ${total} centimes`)
  console.log(`Debug: Toutes les contributions pour cette cagnotte:`, 
    Array.from(mockContributions.values())
      .filter(c => c.pot_id === pot.id)
      .map(c => ({ id: c.id, amount: c.amount_cents, email: c.email }))
  )
  
  return total
}

export function getMockContributions(potSlug: string): MockContribution[] {
  const pot = mockPots.get(potSlug)
  if (!pot) return []
  
  const contributions = Array.from(mockContributions.values()).filter(
    c => c.pot_id === pot.id
  )
  
  console.log(`Debug: Toutes les contributions:`, contributions.map(c => ({
    id: c.id,
    pot_id: c.pot_id,
    amount: c.amount_cents
  })))
  
  return contributions
}

export function closeMockPot(slug: string): boolean {
  const pot = mockPots.get(slug)
  if (!pot) return false
  
  pot.status = 'CLOSED'
  pot.closed_at = new Date().toISOString()
  mockPots.set(slug, pot)
  
  return true
}

export function createMockRefunds(refunds: Array<{
  contribution_id: string
  pot_id: string
  amount_cents: number
}>): MockRefund[] {
  const newRefunds: MockRefund[] = []
  
  refunds.forEach(refundData => {
    const newRefund: MockRefund = {
      id: `mock_refund_${Date.now()}_${Math.random()}`,
      contribution_id: refundData.contribution_id,
      pot_id: refundData.pot_id,
      amount_cents: refundData.amount_cents,
      status: 'SUCCEEDED', // En mode mock, on marque comme réussi
      stripe_refund_id: null,
      processed_at: new Date().toISOString(),
      failure_reason: null,
      created_at: new Date().toISOString(),
    }
    
    mockRefunds.set(newRefund.id, newRefund)
    newRefunds.push(newRefund)
  })
  
  return newRefunds
}

export function getMockRefunds(potSlug: string): MockRefund[] {
  const pot = mockPots.get(potSlug)
  if (!pot) return []
  
  return Array.from(mockRefunds.values()).filter(
    r => r.pot_id === pot.id
  )
}

export function getAllMockPots(): MockPot[] {
  return Array.from(mockPots.values())
}


