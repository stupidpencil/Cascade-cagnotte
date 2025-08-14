import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createMockPot } from '@/lib/mock-storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, objective_cents, fixed_amount_cents, ends_at, pin } = body

    // Validation des données
    if (!name?.trim() || !objective_cents || !fixed_amount_cents || !ends_at) {
      return NextResponse.json(
        { error: 'Données manquantes ou invalides' },
        { status: 400 }
      )
    }

    if (objective_cents <= 0 || fixed_amount_cents <= 0) {
      return NextResponse.json(
        { error: 'Les montants doivent être positifs' },
        { status: 400 }
      )
    }

    // Mode mock si Supabase n'est pas configuré ou pour forcer le mode mock
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co' || process.env.FORCE_MOCK === 'true') {
      const mockSlug = Math.random().toString(36).substring(2, 10)
      const mockOwnerToken = Math.random().toString(36).substring(2, 20)
      
      // Créer la cagnotte dans le stockage mock
      const mockPot = createMockPot({
        slug: mockSlug,
        name,
        objective_cents,
        fixed_amount_cents,
        ends_at: ends_at.includes('T') ? new Date(ends_at).toISOString() : new Date(ends_at + 'T23:59:59.000Z').toISOString(),
        owner_token: mockOwnerToken,
        pin: pin || null,
        status: 'OPEN',
        closed_at: null,
      })
      
      const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${mockSlug}`
      const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${mockSlug}?owner=${mockOwnerToken}`

      return NextResponse.json({
        id: mockPot.id,
        slug: mockPot.slug,
        publicUrl,
        adminUrl,
        ownerToken: mockOwnerToken,
      })
    }

    // Mode Supabase réel
    const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug')
    if (slugError) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération du slug' },
        { status: 500 }
      )
    }

    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_unique_token')
    if (tokenError) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération du token' },
        { status: 500 }
      )
    }

    const { data: pot, error } = await supabase
      .from('pots')
      .insert({
        slug: slugData,
        name: name.trim(),
        objective_cents,
        fixed_amount_cents,
        ends_at: ends_at.includes('T') ? new Date(ends_at).toISOString() : new Date(ends_at + 'T23:59:59.000Z').toISOString(),
        owner_token: tokenData,
        pin: pin || null,
        status: 'OPEN',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la cagnotte' },
        { status: 500 }
      )
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${pot.slug}`
    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${pot.slug}?owner=${pot.owner_token}`

    return NextResponse.json({
      id: pot.id,
      slug: pot.slug,
      publicUrl,
      adminUrl,
      ownerToken: pot.owner_token,
    })
  } catch (error) {
    console.error('Erreur lors de la création de la cagnotte:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
