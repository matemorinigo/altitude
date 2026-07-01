import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../lib/categories'

export interface Category {
  id: string
  user_id: string
  code: string
  label: string
  kind: 'EXPENSE' | 'INCOME'
  is_system: boolean
  sort_order: number
}

const QK = ['categories'] as const

const PLACEHOLDER: Category[] = CATEGORIES.map((c, i) => ({
  id: `placeholder-${c.code}`,
  user_id: '',
  code: c.code,
  label: c.label,
  kind: c.kind as 'EXPENSE' | 'INCOME',
  is_system: false,
  sort_order: i,
}))

export function useCategories() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Category[]
    },
    placeholderData: PLACEHOLDER,
  })
}

export function useUserCategories() {
  const { data = [], ...rest } = useCategories()
  return { data: data.filter(c => !c.is_system), ...rest }
}

export function useAddCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { code: string; label: string; kind: 'EXPENSE' | 'INCOME' }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: existing } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('user_id', user!.id)
        .order('sort_order', { ascending: false })
        .limit(1)
      const nextOrder = ((existing?.[0]?.sort_order as number) ?? 0) + 1

      const { data, error } = await supabase.from('categories').insert({
        user_id: user!.id,
        code: payload.code.toUpperCase().replace(/\s+/g, '_'),
        label: payload.label.toUpperCase(),
        kind: payload.kind,
        sort_order: nextOrder,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { id: string; label?: string; kind?: 'EXPENSE' | 'INCOME' }) => {
      const updates: Record<string, string> = {}
      if (payload.label) updates.label = payload.label.toUpperCase()
      if (payload.kind) updates.kind = payload.kind
      const { error } = await supabase.from('categories').update(updates).eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: cat } = await supabase.from('categories').select('code').eq('id', id).single()
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category', cat?.code ?? '')
      if (count && count > 0) {
        throw new Error('HAY TRANSACCIONES CON ESTA CATEGORÍA')
      }
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
