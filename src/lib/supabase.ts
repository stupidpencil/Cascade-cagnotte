import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'

// Client Supabase pour le serveur
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Client Supabase pour le navigateur
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Types TypeScript pour la nouvelle logique
export interface Pot {
  id: string
  slug: string
  name: string
  objective_cents: number // Objectif en centimes
  fixed_amount_cents: number // Montant fixe en centimes
  ends_at: string
  owner_token: string
  pin: string | null
  status: 'OPEN' | 'CLOSED'
  closed_at: string | null
  created_at: string
}

export interface Contribution {
  id: string
  pot_id: string
  amount_cents: number // Toujours égal à fixed_amount_cents
  email: string | null
  display_name: string | null
  is_anonymous: boolean
  contrib_token: string
  stripe_session_id: string | null
  paid_at: string
  created_at: string
}

export interface Refund {
  id: string
  contribution_id: string
  pot_id: string
  amount_cents: number // Montant à rembourser en centimes
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  stripe_refund_id: string | null
  processed_at: string | null
  failure_reason: string | null
  created_at: string
}

// Types pour les réponses API
export interface PotWithStats extends Pot {
  total_collected_cents: number
  contributors_count: number
  estimated_refund_if_i_pay_now_cents: number
  current_surplus_cents: number
}

export interface ContributionWithRefund extends Contribution {
  estimated_refund_at_payment_time_cents: number
}

export interface CloseResult {
  total_collected_cents: number
  objective_cents: number
  surplus_cents: number
  contributors_count: number
  refund_per_person_before_rounding_cents: number
  refunds: Array<{
    contribution_id: string
    email: string | null
    amount_cents: number
  }>
  total_refunds_cents: number
}
