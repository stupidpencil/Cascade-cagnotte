import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  getCurrentEstimatedRefund, 
  getCurrentSurplus
} from '@/lib/calculations'
import { 
  getMockPot, 
  getMockContributionsCount,
  getMockTotalCollected
} from '@/lib/mock-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Mode mock si Supabase n'est pas configuré ou pour forcer le mode mock
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co' || process.env.FORCE_MOCK === 'true' || true) {
      console.log(`API GET: Recherche de la cagnotte ${slug}`)
      const mockPot = getMockPot(slug)
      
      if (!mockPot) {
        return NextResponse.json(
          { error: 'Cagnotte non trouvée' },
          { status: 404 }
        )
      }

      const totalCollectedCents = getMockTotalCollected(slug)
      const contributorsCount = getMockContributionsCount(slug)
      const estimatedRefundCents = getCurrentEstimatedRefund(mockPot, contributorsCount, totalCollectedCents)
      const currentSurplusCents = getCurrentSurplus(mockPot, totalCollectedCents)

      return NextResponse.json({
        id: mockPot.id,
        slug: mockPot.slug,
        name: mockPot.name,
        objective_cents: mockPot.objective_cents,
        fixed_amount_cents: mockPot.fixed_amount_cents,
        ends_at: mockPot.ends_at,
        status: mockPot.status,
        closed_at: mockPot.closed_at,
        total_collected_cents: totalCollectedCents,
        contributors_count: contributorsCount,
        estimated_refund_if_i_pay_now_cents: estimatedRefundCents,
        current_surplus_cents: currentSurplusCents,
      })
    }

    // Mode Supabase réel
    const { data: pot, error: potError } = await supabase
      .from('pots')
      .select('*')
      .eq('slug', slug)
      .single()

    if (potError || !pot) {
      return NextResponse.json(
        { error: 'Cagnotte non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les contributions
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('amount_cents')
      .eq('pot_id', pot.id)

    if (contribError) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des contributions' },
        { status: 500 }
      )
    }

    const totalCollectedCents = contributions?.reduce((sum, c) => sum + c.amount_cents, 0) || 0
    const contributorsCount = contributions?.length || 0
    const estimatedRefundCents = getCurrentEstimatedRefund(pot, contributorsCount, totalCollectedCents)
    const currentSurplusCents = getCurrentSurplus(pot, totalCollectedCents)

    return NextResponse.json({
      id: pot.id,
      slug: pot.slug,
      name: pot.name,
      objective_cents: pot.objective_cents,
      fixed_amount_cents: pot.fixed_amount_cents,
      ends_at: pot.ends_at,
      status: pot.status,
      closed_at: pot.closed_at,
      total_collected_cents: totalCollectedCents,
      contributors_count: contributorsCount,
      estimated_refund_if_i_pay_now_cents: estimatedRefundCents,
      current_surplus_cents: currentSurplusCents,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la cagnotte:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
