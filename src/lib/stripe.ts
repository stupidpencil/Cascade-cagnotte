import Stripe from 'stripe'

// Mode mock pour les tests (bypass Stripe)
export const MOCK_MODE = process.env.NODE_ENV === 'development' && process.env.STRIPE_MOCK === 'true'

// Initialiser Stripe seulement si on n'est pas en mode mock
const stripe = MOCK_MODE 
  ? null 
  : new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
      apiVersion: '2025-07-30.basil' as any,
    })

export { stripe }

/**
 * Crée une session de paiement Stripe
 * @param amount Le montant en centimes
 * @param potSlug Le slug de la cagnotte
 * @param contributionId L'ID de la contribution
 * @param email L'email du contributeur (optionnel)
 * @returns La session Stripe
 */
export async function createPaymentSession(
  amount: number,
  potSlug: string,
  contributionId: string,
  email?: string
) {
  if (!stripe) {
    throw new Error('Stripe non configuré')
  }
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Contribution à la cagnotte',
            description: `Contribution de ${(amount / 100).toFixed(2)}€`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${potSlug}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${potSlug}`,
    customer_email: email,
    metadata: {
      contribution_id: contributionId,
      pot_slug: potSlug,
    },
  })

  return session
}

/**
 * Vérifie une session de paiement
 * @param sessionId L'ID de la session
 * @returns Les détails de la session
 */
export async function getSession(sessionId: string) {
  if (!stripe) {
    throw new Error('Stripe non configuré')
  }
  
  return await stripe.checkout.sessions.retrieve(sessionId)
}

export function createMockSession(
  amount: number,
  potSlug: string,
  contributionId: string,
  email?: string
) {
  return {
    id: `mock_session_${Date.now()}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${potSlug}/thanks?session_id=mock_session_${Date.now()}`,
    metadata: {
      contribution_id: contributionId,
      pot_slug: potSlug,
    },
  }
}
