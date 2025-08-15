import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CreatePotRequestV2 } from '@/lib/types-v2'
import { createMockPot } from '@/lib/mock-storage'

export async function POST(request: NextRequest) {
  try {
    const body: CreatePotRequestV2 = await request.json()

    // Validation des champs requis
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Le nom de la cagnotte est requis' },
        { status: 400 }
      )
    }

    if (!body.objective_cents || body.objective_cents <= 0) {
      return NextResponse.json(
        { error: 'L\'objectif doit être supérieur à 0' },
        { status: 400 }
      )
    }

    if (!body.fixed_amount_cents || body.fixed_amount_cents <= 0) {
      return NextResponse.json(
        { error: 'Le montant fixe doit être supérieur à 0' },
        { status: 400 }
      )
    }

    if (!body.ends_at) {
      return NextResponse.json(
        { error: 'La date de fin est requise' },
        { status: 400 }
      )
    }

    // Validation spécifique au mode de montant
    if (body.amount_mode === 'TIERS') {
      if (!body.tiers || body.tiers.length === 0) {
        return NextResponse.json(
          { error: 'Au moins un palier doit être défini pour le mode TIERS' },
          { status: 400 }
        )
      }
      
      // Vérifier que les paliers sont valides
      for (const tier of body.tiers) {
        if (tier.amount_cents < 10) {
          return NextResponse.json(
            { error: 'Les paliers doivent être d\'au moins 0,10 €' },
            { status: 400 }
          )
        }
      }
    }

    // Validation des paramètres de solidarité
    if (body.solidarity_threshold_cents !== undefined) {
      if (body.solidarity_threshold_cents < 0) {
        return NextResponse.json(
          { error: 'Le seuil de solidarité ne peut pas être négatif' },
          { status: 400 }
        )
      }
      
      if (!body.solidarity_rate || body.solidarity_rate < 0 || body.solidarity_rate > 1) {
        return NextResponse.json(
          { error: 'Le taux de solidarité doit être entre 0 et 1' },
          { status: 400 }
        )
      }
    }

    // Validation des paramètres de réserve
    if (body.reserve_enabled && (!body.reserve_target_cents || body.reserve_target_cents <= 0)) {
      return NextResponse.json(
        { error: 'La cible de réserve doit être supérieure à 0' },
        { status: 400 }
      )
    }

    // Validation de la durée des cycles
    if (body.frequency === 'RECURRING') {
      if (!body.cycle_duration_days || body.cycle_duration_days < 1 || body.cycle_duration_days > 365) {
        return NextResponse.json(
          { error: 'La durée des cycles doit être entre 1 et 365 jours' },
          { status: 400 }
        )
      }
    }

    // Mode mock si Supabase n'est pas configuré
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://dummy.supabase.co' || process.env.FORCE_MOCK === 'true') {
      // Générer un slug et un token uniques
      const slug = Math.random().toString(36).substring(2, 10)
      const ownerToken = Math.random().toString(36).substring(2, 20)
      
      // Créer la cagnotte dans le mock storage
      console.log(`API CREATE: Création de la cagnotte ${slug}`)
      const mockPot = createMockPot({
        slug,
        name: body.name,
        objective_cents: body.objective_cents,
        fixed_amount_cents: body.fixed_amount_cents,
        ends_at: body.ends_at,
        owner_token: ownerToken,
        pin: body.pin || null,
        status: 'OPEN',
        closed_at: null,
        
        // Nouvelles propriétés V2
        amount_mode: body.amount_mode || 'FIXED',
        frequency: body.frequency || 'ONE_TIME',
        tiers: body.tiers || undefined,
        solidarity_threshold_cents: body.solidarity_threshold_cents || undefined,
        solidarity_rate: body.solidarity_rate || 0.1,
        reserve_enabled: body.reserve_enabled || false,
        reserve_target_cents: body.reserve_target_cents || undefined,
        reserve_balance_cents: 0,
        current_cycle: 1,
        cycle_duration_days: body.cycle_duration_days || undefined
      })
      console.log(`API CREATE: Cagnotte créée avec succès: ${mockPot.slug}`)

      return NextResponse.json({
        id: mockPot.id,
        slug: mockPot.slug,
        ownerToken: mockPot.owner_token,
        publicUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${mockPot.slug}`,
        adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${mockPot.slug}?owner=${mockPot.owner_token}`
      })
    }

    // Mode Supabase réel
    console.log('Utilisation du mode Supabase réel')
    
    // Générer un slug et un token uniques
    const slug = Math.random().toString(36).substring(2, 10)
    const ownerToken = Math.random().toString(36).substring(2, 20)
    
    // Vérifier que le slug n'existe pas déjà
    const { data: existingPot, error: checkError } = await supabase
      .from('pots')
      .select('slug')
      .eq('slug', slug)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erreur lors de la vérification du slug:', checkError)
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du slug' },
        { status: 500 }
      )
    }
    
    if (existingPot) {
      return NextResponse.json(
        { error: 'Slug déjà utilisé, veuillez réessayer' },
        { status: 409 }
      )
    }

    // Créer la cagnotte
    const { data: pot, error: potError } = await supabase
      .from('pots')
      .insert({
        slug: slug,
        name: body.name,
        objective_cents: body.objective_cents,
        fixed_amount_cents: body.fixed_amount_cents,
        ends_at: body.ends_at,
        owner_token: ownerToken,
        pin: body.pin || null,
        
        // Nouvelles propriétés V2
        amount_mode: body.amount_mode || 'FIXED',
        frequency: body.frequency || 'ONE_TIME',
        tiers: body.tiers || null,
        solidarity_threshold_cents: body.solidarity_threshold_cents || null,
        solidarity_rate: body.solidarity_rate || 0.1,
        reserve_enabled: body.reserve_enabled || false,
        reserve_target_cents: body.reserve_target_cents || null,
        reserve_balance_cents: 0,
        current_cycle: 1,
        cycle_duration_days: body.cycle_duration_days || null
      })
      .select()
      .single()

    if (potError) {
      console.error('Erreur lors de la création de la cagnotte:', potError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la cagnotte' },
        { status: 500 }
      )
    }

    // Si c'est une cagnotte récurrente, créer le premier cycle
    if (body.frequency === 'RECURRING') {
      const { error: cycleError } = await supabase
        .from('cycles')
        .insert({
          pot_id: pot.id,
          cycle_number: 1,
          objective_cents: body.objective_cents,
          total_collected_cents: 0,
          contributors_count: 0,
          started_at: new Date().toISOString(),
          status: 'ACTIVE'
        })

      if (cycleError) {
        console.error('Erreur lors de la création du cycle:', cycleError)
        // Ne pas échouer complètement, juste logger l'erreur
      }
    }

    return NextResponse.json({
      id: pot.id,
      slug: pot.slug,
      ownerToken: pot.owner_token,
      publicUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${pot.slug}`,
      adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${pot.slug}?owner=${pot.owner_token}`
    })
  } catch (error) {
    console.error('Erreur lors de la création de la cagnotte:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
