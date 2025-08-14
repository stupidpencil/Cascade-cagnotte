import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getMockContributions } from '@/lib/mock-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Mode mock si Supabase n'est pas configuré ou pour forcer le mode mock
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co' || process.env.FORCE_MOCK === 'true') {
      const contributions = getMockContributions(slug)
      
      // Formater les contributions pour l'affichage public
      const formattedContributions = contributions.map(contrib => ({
        id: contrib.id,
        amount_cents: contrib.amount_cents,
        display_name: contrib.is_anonymous ? `Anonyme #${contrib.id.slice(-4)}` : (contrib.display_name || 'Anonyme'),
        is_anonymous: contrib.is_anonymous,
        paid_at: contrib.paid_at,
        // Ne pas exposer l'email en public
      }))

      return NextResponse.json({
        contributions: formattedContributions
      })
    }

    // Mode Supabase réel
    const { data: pot, error: potError } = await supabase
      .from('pots')
      .select('id')
      .eq('slug', slug)
      .single()

    if (potError || !pot) {
      return NextResponse.json(
        { error: 'Cagnotte non trouvée' },
        { status: 404 }
      )
    }

    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('id, amount_cents, display_name, is_anonymous, paid_at')
      .eq('pot_id', pot.id)
      .order('paid_at', { ascending: true })

    if (contribError) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des contributions' },
        { status: 500 }
      )
    }

    // Formater les contributions pour l'affichage public
    const formattedContributions = (contributions || []).map(contrib => ({
      id: contrib.id,
      amount_cents: contrib.amount_cents,
      display_name: contrib.is_anonymous ? `Anonyme #${contrib.id.slice(-4)}` : (contrib.display_name || 'Anonyme'),
      is_anonymous: contrib.is_anonymous,
      paid_at: contrib.paid_at,
    }))

    return NextResponse.json({
      contributions: formattedContributions
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des contributions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
