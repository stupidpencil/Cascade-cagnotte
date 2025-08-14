// Types pour Cascade Cagnotte V2

export type AmountMode = 'FIXED' | 'TIERS' | 'FREE'
export type Frequency = 'ONE_TIME' | 'RECURRING'
export type CycleStatus = 'ACTIVE' | 'CLOSED'

export interface Tier {
  amount_cents: number
  label: string
}

export interface PotV2 {
  id: string
  slug: string
  name: string
  objective_cents: number
  fixed_amount_cents: number // Gardé pour compatibilité V1
  ends_at: string
  owner_token: string
  pin?: string
  status: 'OPEN' | 'CLOSED'
  closed_at?: string
  created_at: string
  
  // Nouvelles propriétés V2
  amount_mode: AmountMode
  frequency: Frequency
  tiers?: Tier[]
  solidarity_threshold_cents?: number
  solidarity_rate: number // 0.1 = 10%
  reserve_enabled: boolean
  reserve_target_cents?: number
  reserve_balance_cents: number
  current_cycle: number
  cycle_duration_days?: number
  
  // Calculs en temps réel
  total_collected_cents: number
  contributors_count: number
  estimated_refund_if_i_pay_now_cents: number
}

export interface ContributionV2 {
  id: string
  pot_id: string
  amount_cents: number // Montant suggéré (compatibilité V1)
  amount_paid_cents: number // Montant réellement payé (nouveau)
  email?: string
  display_name?: string
  is_anonymous: boolean
  contrib_token: string
  stripe_session_id?: string
  paid_at: string
  created_at: string
  
  // Nouvelles propriétés V2
  cycle_number: number
  tier_selected?: string
}

export interface Cycle {
  id: string
  pot_id: string
  cycle_number: number
  objective_cents: number
  total_collected_cents: number
  surplus_deficit_cents: number
  reserve_used_cents: number
  reserve_added_cents: number
  contributors_count: number
  started_at: string
  ended_at?: string
  status: CycleStatus
  created_at: string
}

export interface EquityLedgerEntry {
  id: string
  pot_id: string
  contribution_id: string
  cycle_number: number
  balance_cents: number // Peut être négatif
  created_at: string
}

export interface RefundV2 {
  id: string
  contribution_id: string
  pot_id: string
  amount_cents: number
  status: 'PENDING' | 'PROCESSED' | 'FAILED'
  stripe_refund_id?: string
  processed_at?: string
  failure_reason?: string
  created_at: string
  cycle_number: number
}

// Types pour les calculs V2
export interface RedistributionResult {
  contribution_id: string
  amount_paid_cents: number
  refund_amount_cents: number
  final_cost_cents: number
  solidarity_contribution_cents: number
}

export interface CycleClosureResult {
  cycle: Cycle
  redistributions: RedistributionResult[]
  reserve_balance_after: number
  total_surplus: number
  total_solidarity: number
}

// Types pour l'API
export interface CreatePotRequestV2 {
  name: string
  objective_cents: number
  fixed_amount_cents: number
  ends_at: string
  pin?: string
  
  // Nouvelles propriétés V2
  amount_mode: AmountMode
  frequency: Frequency
  tiers?: Tier[]
  solidarity_threshold_cents?: number
  solidarity_rate?: number
  reserve_enabled?: boolean
  reserve_target_cents?: number
  cycle_duration_days?: number
}

export interface ContributeRequestV2 {
  email: string
  display_name?: string
  is_anonymous?: boolean
  amount_cents?: number // Pour mode FREE
  tier_selected?: string // Pour mode TIERS
}

// Types pour les composants UI
export interface AmountModeConfig {
  mode: AmountMode
  label: string
  description: string
  icon: string
}

export interface FrequencyConfig {
  value: Frequency
  label: string
  description: string
  defaultDays?: number
}

// Configuration des modes de montant
export const AMOUNT_MODES: AmountModeConfig[] = [
  {
    mode: 'FIXED',
    label: 'Montant fixe unique',
    description: 'Tous les contributeurs paient le même montant',
    icon: '💰'
  },
  {
    mode: 'TIERS',
    label: 'Paliers prédéfinis',
    description: 'Choisissez parmi plusieurs montants prédéfinis',
    icon: '📊'
  },
  {
    mode: 'FREE',
    label: 'Montant libre',
    description: 'Chaque contributeur choisit son montant',
    icon: '🎯'
  }
]

// Configuration des fréquences
export const FREQUENCIES: FrequencyConfig[] = [
  {
    value: 'ONE_TIME',
    label: 'Ponctuel',
    description: 'Une seule contribution par personne',
    defaultDays: 30
  },
  {
    value: 'RECURRING',
    label: 'Récurrent',
    description: 'Contributions régulières avec cycles',
    defaultDays: 30
  }
]

// Types pour les calculs de solidarité
export interface SolidarityCalculation {
  threshold_cents: number
  rate: number
  contribution_above_threshold: number
  solidarity_amount: number
  refundable_amount: number
}
