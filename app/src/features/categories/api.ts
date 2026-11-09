import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { isIconName, type IconName } from '@/components/ui/icon'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Category = Pick<Tables<'categories'>, 'id' | 'name' | 'icon' | 'color' | 'sort_order'>

/** Active categories in admin-defined order (RLS hides inactive ones from non-admins). */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, color, sort_order')
        .eq('is_active', true)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 10 * 60_000,
  })
}

/** id -> category, for cards that only carry a category_id. */
export function useCategoryMap(): Map<string, Category> {
  const { data } = useCategories()
  return useMemo(() => new Map((data ?? []).map((c) => [c.id, c])), [data])
}

/** The category's Ionicons name, or a neutral fallback if the database has an unknown icon. */
export function categoryIcon(category: Category | undefined): IconName {
  return category && isIconName(category.icon) ? category.icon : 'sparkles-outline'
}
