import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/stripe'
import { 
  getEstimatedRefundIfIPayNow,
  getCurrentSurplus
} from '@/lib/calculations'
import { 
  getMockPot, 
  createMockContribution, 
  getMockContributionsCount,
  getMockTotalCollected
} from '@/lib/mock-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { email } = body // amount_cents est ignoré, on utilise toujours le montant fixe

    // Mode mock si Supabase n'est pas configuré ou pour forcer le mode mock
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co' || process.env.FORCE_MOCK === 'true') {
      const mockPot = getMockPot(slug)
      
      if (!mockPot) {
        return NextResponse.json(
          { error: 'Cagnotte non trouvée' },
          { status: 404 }
        )
      }

      if (mockPot.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'Cette cagnotte est fermée' },
          { status: 400 }
        )
      }

      // Vérifier que la date de fin n'est pas dépassée
      const now = new Date()
      const endDate = new Date(mockPot.ends_at)
      if (now > endDate) {
        return NextResponse.json(
          { error: 'La date limite de cette cagnotte est dépassée' },
          { status: 400 }
        )
      }

      const mockContribToken = Math.random().toString(36).substring(2, 20)
      
      // Extraire les nouveaux champs
      const { display_name, is_anonymous } = body
      
      // Créer la contribution avec le montant fixe
      const mockContribution = createMockContribution({
        pot_id: mockPot.id,
        amount_cents: mockPot.fixed_amount_cents, // Toujours le montant fixe
        email: email || null,
        display_name: display_name || null,
        is_anonymous: is_anonymous || false,
        contrib_token: mockContribToken,
        stripe_session_id: `mock_session_${Date.now()}`,
        paid_at: new Date().toISOString(),
      })
      

      
      // Calculer le remboursement estimé au moment du paiement
      const currentTotalCollected = getMockTotalCollected(slug)
      const currentContributorsCount = getMockContributionsCount(slug)
      const estimatedRefundAtPaymentTime = getEstimatedRefundIfIPayNow(
        mockPot, 
        currentContributorsCount, 
        currentTotalCollected
      )
      
      return NextResponse.json({
        contribution_id: mockContribution.id,
        amount_cents: mockPot.fixed_amount_cents,
        estimated_refund_at_payment_time_cents: estimatedRefundAtPaymentTime,
        checkout_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${slug}/thanks?session_id=mock_session_${Date.now()}`,
        contrib_token: mockContribToken,
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

    if (pot.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cette cagnotte est fermée' },
        { status: 400 }
      )
    }

    // Vérifier que la date de fin n'est pas dépassée
    const now = new Date()
    const endDate = new Date(pot.ends_at)
    if (now > endDate) {
      return NextResponse.json(
        { error: 'La date limite de cette cagnotte est dépassée' },
        { status: 400 }
      )
    }

    // Générer un token de contribution unique
    const { data: contribTokenData, error: tokenError } = await supabase.rpc('generate_contrib_token')
    if (tokenError) {
      console.error('Erreur génération token:', tokenError)
      return NextResponse.json(
        { error: 'Erreur lors de la génération du token' },
        { status: 500 }
      )
    }

    // Extraire les nouveaux champs
    const { display_name, is_anonymous } = body

    // Créer la contribution avec le montant fixe
    const { data: contribution, error: contribError } = await supabase
      .from('contributions')
      .insert({
        pot_id: pot.id,
        amount_cents: pot.fixed_amount_cents, // Toujours le montant fixe
        amount_paid_cents: pot.fixed_amount_cents, // Montant effectivement payé
        email: email || null,
        display_name: display_name || null,
        is_anonymous: is_anonymous || false,
        contrib_token: contribTokenData,
        stripe_session_id: null, // Sera mis à jour par le webhook Stripe
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (contribError) {
      console.error('Erreur création contribution:', contribError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la contribution' },
        { status: 500 }
      )
    }

    // Récupérer les contributions actuelles pour calculer le remboursement estimé
    const { data: contributions, error: contribsError } = await supabase
      .from('contributions')
      .select('amount_cents')
      .eq('pot_id', pot.id)

    if (contribsError) {
      return NextResponse.json(
        { error: 'Erreur lors du calcul du remboursement estimé' },
        { status: 500 }
      )
    }

    const currentTotalCollected = contributions?.reduce((sum, c) => sum + c.amount_cents, 0) || 0
    const currentContributorsCount = contributions?.length || 0
    const estimatedRefundAtPaymentTime = getEstimatedRefundIfIPayNow(
      pot, 
      currentContributorsCount, 
      currentTotalCollected
    )

    // Créer une session de paiement Stripe (ou URL de paiement)
    let checkoutUrl = ''
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    if (MOCK_MODE) {
      checkoutUrl = `${baseUrl}/c/${slug}/thanks?session_id=mock_session_${Date.now()}`
    } else {
      // TODO: Intégrer Stripe pour créer une vraie session de paiement
      checkoutUrl = `${baseUrl}/c/${slug}/thanks?session_id=stripe_session_${Date.now()}`
    }

    return NextResponse.json({
      contribution_id: contribution.id,
      amount_cents: pot.fixed_amount_cents,
      estimated_refund_at_payment_time_cents: estimatedRefundAtPaymentTime,
      checkout_url: checkoutUrl,
      contrib_token: contribution.contrib_token,
    })
  } catch (error) {
    console.error('Erreur lors de la création de la contribution:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
