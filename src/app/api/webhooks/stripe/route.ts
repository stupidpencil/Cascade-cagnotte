import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, MOCK_MODE } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Mode mock - retourner succès immédiatement
    if (MOCK_MODE) {
      return NextResponse.json({ received: true })
    }

    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature Stripe manquante' },
        { status: 400 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe non configuré' },
        { status: 500 }
      )
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Erreur de signature webhook:', err)
      return NextResponse.json(
        { error: 'Signature webhook invalide' },
        { status: 400 }
      )
    }

    // Traiter l'événement selon son type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object)
        break
      
      default:
        console.log(`Événement non géré: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Erreur webhook:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const { contribution_id, pot_slug } = session.metadata

  if (!contribution_id) {
    console.error('ID de contribution manquant dans les métadonnées')
    return
  }

  try {
    // Mettre à jour le statut de la contribution
    const { error: contribError } = await supabase
      .from('contributions')
      .update({ 
        status: 'confirmed',
        stripe_session_id: session.id
      })
      .eq('id', contribution_id)

    if (contribError) {
      console.error('Erreur lors de la mise à jour de la contribution:', contribError)
      return
    }

    // Récupérer la contribution pour obtenir le montant
    const { data: contribution, error: getError } = await supabase
      .from('contributions')
      .select('amount_cents, pot_id')
      .eq('id', contribution_id)
      .single()

    if (getError || !contribution) {
      console.error('Erreur lors de la récupération de la contribution:', getError)
      return
    }

    // Mettre à jour le montant collecté de la cagnotte
    const { data: currentPot, error: getPotError } = await supabase
      .from('pots')
      .select('collected_amount_cents')
      .eq('id', contribution.pot_id)
      .single()

    if (getPotError || !currentPot) {
      console.error('Erreur lors de la récupération de la cagnotte:', getPotError)
      return
    }

    const { error: potError } = await supabase
      .from('pots')
      .update({ 
        collected_amount_cents: currentPot.collected_amount_cents + contribution.amount_cents
      })
      .eq('id', contribution.pot_id)

    if (potError) {
      console.error('Erreur lors de la mise à jour de la cagnotte:', potError)
    }

    console.log(`Contribution confirmée: ${contribution_id} pour ${contribution.amount_cents} centimes`)

  } catch (error) {
    console.error('Erreur lors du traitement de la session complétée:', error)
  }
}

async function handleCheckoutSessionExpired(session: any) {
  const { contribution_id } = session.metadata

  if (!contribution_id) {
    console.error('ID de contribution manquant dans les métadonnées')
    return
  }

  try {
    // Supprimer la contribution expirée
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', contribution_id)

    if (error) {
      console.error('Erreur lors de la suppression de la contribution expirée:', error)
    } else {
      console.log(`Contribution expirée supprimée: ${contribution_id}`)
    }

  } catch (error) {
    console.error('Erreur lors du traitement de la session expirée:', error)
  }
}
