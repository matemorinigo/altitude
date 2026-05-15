import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getToday, isoDate } from '../lib/time'
import type { ScheduledEvent } from '../types/db'

const QK = ['scheduled_events'] as const

// Eventos PENDING con due_date <= hoy, ordenados por fecha
export function usePendingEvents() {
  return useQuery({
    queryKey: [...QK, 'pending'],
    queryFn: async () => {
      const today = isoDate(getToday())
      const { data, error } = await supabase
        .from('scheduled_events')
        .select('*, recurring_templates(*)')
        .eq('status', 'PENDING')
        .lte('due_date', today)
        .order('due_date', { ascending: true })
      if (error) throw error
      return data as ScheduledEvent[]
    },
  })
}

// Último payday confirmado (para calcular lastPayday del ciclo)
export function useLastConfirmedPayday() {
  return useQuery({
    queryKey: [...QK, 'last_payday'],
    queryFn: async () => {
      // Buscar template is_payday
      const { data: templates } = await supabase
        .from('recurring_templates')
        .select('id')
        .eq('is_payday', true)
        .eq('is_active', true)
        .limit(1)

      if (!templates?.length) return null

      const { data: events } = await supabase
        .from('scheduled_events')
        .select('due_date')
        .eq('template_id', templates[0].id)
        .eq('status', 'CONFIRMED')
        .order('due_date', { ascending: false })
        .limit(1)

      if (!events?.length) return null
      // Parsear como fecha local para evitar desfase de timezone
      const [y, m, d] = events[0].due_date.split('-').map(Number)
      return new Date(y, m - 1, d)
    },
  })
}

export function useConfirmEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, transactionId }: { eventId: string; transactionId: string }) => {
      const { error } = await supabase
        .from('scheduled_events')
        .update({ status: 'CONFIRMED', confirmed_transaction_id: transactionId })
        .eq('id', eventId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useSkipEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('scheduled_events')
        .update({ status: 'SKIPPED' })
        .eq('id', eventId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
