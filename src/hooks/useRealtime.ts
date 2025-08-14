import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Pot, Contribution } from '@/lib/supabase'

export function useRealtimePot(slug: string) {
  const [pot, setPot] = useState<Pot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Récupérer les données initiales
    const fetchPot = async () => {
      try {
        const { data, error } = await supabase
          .from('pots')
          .select('*')
          .eq('slug', slug)
          .single()

        if (error) throw error
        setPot(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    fetchPot()

    // S'abonner aux changements de la cagnotte
    const potSubscription = supabase
      .channel(`pot-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pots',
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPot(payload.new as Pot)
          }
        }
      )
      .subscribe()

    // S'abonner aux changements des contributions
    const contributionsSubscription = supabase
      .channel(`contributions-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
        },
        async (payload) => {
          // Recharger les données de la cagnotte quand une contribution change
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data, error } = await supabase
              .from('pots')
              .select('*')
              .eq('slug', slug)
              .single()

            if (!error && data) {
              setPot(data)
            }
          }
        }
      )
      .subscribe()

    return () => {
      potSubscription.unsubscribe()
      contributionsSubscription.unsubscribe()
    }
  }, [slug, supabase])

  return { pot, loading, error }
}

export function useRealtimeContributions(potId: string) {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Récupérer les contributions initiales
    const fetchContributions = async () => {
      try {
        const { data, error } = await supabase
          .from('contributions')
          .select('*')
          .eq('pot_id', potId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })

        if (error) throw error
        setContributions(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    fetchContributions()

    // S'abonner aux changements des contributions
    const subscription = supabase
      .channel(`contributions-${potId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `pot_id=eq.${potId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Recharger toutes les contributions
            const { data, error } = await supabase
              .from('contributions')
              .select('*')
              .eq('pot_id', potId)
              .eq('status', 'confirmed')
              .order('created_at', { ascending: false })

            if (!error) {
              setContributions(data || [])
            }
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [potId, supabase])

  return { contributions, loading, error }
}
