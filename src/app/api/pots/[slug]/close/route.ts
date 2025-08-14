import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeRefunds } from '@/lib/calculations'
import { 
  getMockPot, 
  closeMockPot, 
  getMockContributions,
  createMockRefunds
} from '@/lib/mock-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { owner_token, pin } = body

    if (!owner_token) {
      return NextResponse.json(
        { error: 'Token propriétaire requis' },
        { status: 400 }
      )
    }

    // Mode mock si Supabase n'est pas configuré
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co') {
      const mockPot = getMockPot(slug)
      
      if (!mockPot) {
        return NextResponse.json(
          { error: 'Cagnotte non trouvée' },
          { status: 404 }
        )
      }

      // Vérifier l'authentification
      if (mockPot.owner_token !== owner_token) {
        return NextResponse.json(
          { error: 'Token propriétaire invalide' },
          { status: 403 }
        )
      }

      // Vérifier le PIN si défini
      if (mockPot.pin && mockPot.pin !== pin) {
        return NextResponse.json(
          { error: 'Code PIN incorrect' },
          { status: 403 }
        )
      }

      if (mockPot.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'Cette cagnotte est déjà fermée' },
          { status: 400 }
        )
      }

      // Récupérer toutes les contributions
      const contributions = getMockContributions(slug)
      const totalCollectedCents = contributions.reduce((sum, c) => sum + c.amount_cents, 0)
      const contributorsCount = contributions.length

      // Calculer les remboursements
      const refundResult = computeRefunds(
        contributions.map(c => ({
          id: c.id,
          amount: c.amount_cents / 100, // Convertir en euros
          email: c.email || undefined
        })),
        mockPot.objective_cents / 100, // Convertir en euros
        totalCollectedCents / 100 // Convertir en euros
      )

      // Fermer la cagnotte
      closeMockPot(slug)

      // Créer les remboursements si il y en a
      if (refundResult.refunds.length > 0) {
        createMockRefunds(
          refundResult.refunds.map(r => ({
            contribution_id: r.contribution_id,
            pot_id: mockPot.id,
            amount_cents: Math.round(r.amount * 100) // Convertir en centimes
          }))
        )
      }

      return NextResponse.json({
        total_collected_cents: totalCollectedCents,
        objective_cents: mockPot.objective_cents,
        surplus_cents: Math.round(refundResult.surplus * 100),
        contributors_count: contributorsCount,
        refund_per_person_before_rounding_cents: Math.round(refundResult.per_person_before_rounding * 100),
        refunds: refundResult.refunds.map(r => ({
          contribution_id: r.contribution_id,
          email: r.email,
          amount_cents: Math.round(r.amount * 100)
        })),
        total_refunds_cents: Math.round(refundResult.surplus * 100)
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

    // Vérifier l'authentification
    if (pot.owner_token !== owner_token) {
      return NextResponse.json(
        { error: 'Token propriétaire invalide' },
        { status: 403 }
      )
    }

    // Vérifier le PIN si défini
    if (pot.pin && pot.pin !== pin) {
      return NextResponse.json(
        { error: 'Code PIN incorrect' },
        { status: 403 }
      )
    }

    if (pot.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cette cagnotte est déjà fermée' },
        { status: 400 }
      )
    }

    // Récupérer toutes les contributions
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('id, amount_cents, email')
      .eq('pot_id', pot.id)

    if (contribError) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des contributions' },
        { status: 500 }
      )
    }

    const totalCollectedCents = contributions?.reduce((sum, c) => sum + c.amount_cents, 0) || 0
    const contributorsCount = contributions?.length || 0

    // Calculer les remboursements
    const refundResult = computeRefunds(
      (contributions || []).map(c => ({
        id: c.id,
        amount: c.amount_cents / 100, // Convertir en euros
        email: c.email || undefined
      })),
      pot.objective_cents / 100, // Convertir en euros
      totalCollectedCents / 100 // Convertir en euros
    )

    // Fermer la cagnotte
    const { error: closeError } = await supabase
      .from('pots')
      .update({ 
        status: 'CLOSED',
        closed_at: new Date().toISOString()
      })
      .eq('id', pot.id)

    if (closeError) {
      return NextResponse.json(
        { error: 'Erreur lors de la fermeture de la cagnotte' },
        { status: 500 }
      )
    }

    // Créer les remboursements si il y en a
    if (refundResult.refunds.length > 0) {
      const refundsToInsert = refundResult.refunds.map(r => ({
        contribution_id: r.contribution_id,
        pot_id: pot.id,
        amount_cents: Math.round(r.amount * 100), // Convertir en centimes
        status: 'PROCESSED', // En mode réel, on marque comme traité (Stripe sera intégré plus tard)
        processed_at: new Date().toISOString()
      }))

      const { error: refundError } = await supabase
        .from('refunds')
        .insert(refundsToInsert)

      if (refundError) {
        return NextResponse.json(
          { error: 'Erreur lors de la création des remboursements: ' + refundError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      total_collected_cents: totalCollectedCents,
      objective_cents: pot.objective_cents,
      surplus_cents: Math.round(refundResult.surplus * 100),
      contributors_count: contributorsCount,
      refund_per_person_before_rounding_cents: Math.round(refundResult.per_person_before_rounding * 100),
      refunds: refundResult.refunds.map(r => ({
        contribution_id: r.contribution_id,
        email: r.email,
        amount_cents: Math.round(r.amount * 100)
      })),
      total_refunds_cents: Math.round(refundResult.surplus * 100)
    })
  } catch (error) {
    console.error('Erreur lors de la fermeture de la cagnotte:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
