import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Account } from '../types/db'

const QK = ['accounts'] as const

export function useAccounts() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Account[]
    },
  })
}

export function useAddAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Pick<Account, 'code' | 'name' | 'type' | 'currency'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('accounts').insert({
        ...payload,
        user_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateAccountAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, alias }: { id: string; alias: string }) => {
      const { error } = await supabase
        .from('accounts')
        .update({ alias })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useArchiveAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_archived: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
