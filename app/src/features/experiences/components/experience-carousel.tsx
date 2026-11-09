import { FlatList, StyleSheet, View } from 'react-native'

import { EmptyState } from '@/components/ui/empty-state'
import type { IconName } from '@/components/ui/icon'
import { InlineError } from '@/components/ui/inline-error'
import { Skeleton } from '@/components/ui/skeleton'
import type { Category } from '@/features/categories/api'
import { screenMargin, shape, spacing } from '@/theme/tokens'

import type { ExperienceCard as Experience } from '../api'

import { ExperienceCard } from './experience-card'

const CARD_WIDTH = 280

type Props = {
  items: Experience[] | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
  categories: Map<string, Category>
  favoriteIds: Set<string>
  onToggleSave: (id: string, next: boolean) => void
  onOpen: (id: string) => void
  empty: { icon: IconName; title: string; description?: string; actionLabel?: string; onAction?: () => void }
  testID?: string
}

/** A horizontal row of plan cards with skeleton, empty and error states. */
export function ExperienceCarousel({
  items,
  isPending,
  error,
  onRetry,
  categories,
  favoriteIds,
  onToggleSave,
  onOpen,
  empty,
  testID,
}: Props) {
  if (isPending) {
    return (
      <View style={styles.skeletonRow}>
        {[0, 1].map((n) => (
          <View key={n} style={styles.skeletonCard}>
            <Skeleton width={CARD_WIDTH} height={168} radius={shape.card} />
            <Skeleton width={180} height={18} />
            <Skeleton width={120} height={14} />
          </View>
        ))}
      </View>
    )
  }
  if (error) return <InlineError error={error} onRetry={onRetry} />
  if (!items || items.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState {...empty} />
      </View>
    )
  }
  return (
    <FlatList
      testID={testID}
      data={items}
      keyExtractor={(i) => i.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + spacing.md}
      snapToAlignment="start"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
      renderItem={({ item }) => (
        <ExperienceCard
          item={item}
          category={categories.get(item.category_id)}
          saved={favoriteIds.has(item.id)}
          onToggleSave={(next) => onToggleSave(item.id, next)}
          onPress={() => onOpen(item.id)}
          width={CARD_WIDTH}
        />
      )}
    />
  )
}

const styles = StyleSheet.create({
  // Vertical padding leaves room for the card shadows (FlatList clips its content).
  list: { paddingHorizontal: screenMargin, paddingTop: spacing.xs, paddingBottom: spacing.lg },
  skeletonRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: screenMargin, overflow: 'hidden' },
  skeletonCard: { gap: spacing.sm },
  empty: {
    marginHorizontal: screenMargin,
    borderRadius: shape.card,
  },
})
