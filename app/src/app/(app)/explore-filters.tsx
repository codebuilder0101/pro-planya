import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Text } from '@/components/ui/text'
import { categoryIcon, useCategories } from '@/features/categories/api'
import {
  DATE_OPTIONS,
  DEFAULT_FILTERS,
  exploreFilters,
  RADIUS_OPTIONS,
  SORT_OPTIONS,
  type ExploreFilters,
} from '@/features/explore/filters'
import { colors, screenMargin, spacing } from '@/theme/tokens'

/** Filters bottom sheet: edits a draft, applied with one primary action. */
export default function ExploreFiltersSheet() {
  const insets = useSafeAreaInsets()
  const categories = useCategories()
  const [draft, setDraft] = useState<ExploreFilters>(() => exploreFilters.get())
  const set = (patch: Partial<ExploreFilters>) => setDraft((d) => ({ ...d, ...patch }))

  const apply = () => {
    exploreFilters.set(draft)
    router.back()
  }
  const clear = () => setDraft({ ...DEFAULT_FILTERS, query: draft.query })

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text variant="title3" accessibilityRole="header">
          Filtros
        </Text>
        <Button label="Limpiar" variant="ghost" size="md" fullWidth={false} onPress={clear} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Group title="¿Cuándo?">
          {DATE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={draft.date === o.value}
              onPress={() => set({ date: o.value })}
            />
          ))}
        </Group>
        <Group title="Distancia">
          {RADIUS_OPTIONS.map((o) => (
            <Chip
              key={o.label}
              label={o.label}
              selected={draft.radiusKm === o.value}
              onPress={() => set({ radiusKm: o.value })}
            />
          ))}
        </Group>
        <Group title="Precio">
          <Chip label="Cualquiera" selected={!draft.freeOnly} onPress={() => set({ freeOnly: false })} />
          <Chip
            label="Solo gratis"
            icon="pricetag-outline"
            selected={draft.freeOnly}
            onPress={() => set({ freeOnly: true })}
          />
        </Group>
        <Group title="Categorías">
          {(categories.data ?? []).map((c) => {
            const selected = draft.categoryIds.includes(c.id)
            return (
              <Chip
                key={c.id}
                label={c.name}
                icon={categoryIcon(c)}
                iconColor={c.color}
                selected={selected}
                onPress={() =>
                  set({
                    categoryIds: selected
                      ? draft.categoryIds.filter((id) => id !== c.id)
                      : [...draft.categoryIds, c.id],
                  })
                }
              />
            )
          })}
        </Group>
        <Group title="Ordenar por">
          {SORT_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={draft.sort === o.value}
              onPress={() => set({ sort: o.value })}
            />
          ))}
        </Group>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button label="Ver resultados" onPress={apply} haptic testID="apply-filters" />
      </View>
    </View>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="subhead" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.wrap}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenMargin + spacing.xs,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  content: { paddingHorizontal: screenMargin + spacing.xs, paddingBottom: spacing.lg, gap: spacing.xl },
  group: { gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    paddingHorizontal: screenMargin + spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
})
