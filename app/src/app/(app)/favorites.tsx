import { router } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategoryMap } from '@/features/categories/api'
import { useFavoritePlans } from '@/features/experiences/api'
import { ExperienceRowCard } from '@/features/experiences/components/experience-row-card'
import { useFavorites } from '@/features/experiences/use-favorites'
import { colors, screenMargin, shape, spacing } from '@/theme/tokens'

/** "Mis favoritas": saved plans that can still be joined. */
export default function FavoritesScreen() {
  const insets = useSafeAreaInsets()
  const plans = useFavoritePlans()
  const categories = useCategoryMap()
  const favorites = useFavorites()
  // Un-saving hides the card at once (the heart toggle is optimistic).
  const list = (plans.data ?? []).filter((p) => favorites.ids.has(p.id))

  if (plans.isPending) {
    return (
      <View style={styles.skeletons}>
        <Skeleton height={128} radius={shape.card} />
        <Skeleton height={128} radius={shape.card} />
        <Skeleton height={128} radius={shape.card} />
      </View>
    )
  }

  if (plans.isError) {
    return (
      <View style={styles.skeletons}>
        <InlineError error={plans.error} onRetry={() => void plans.refetch()} inset={0} />
      </View>
    )
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <ExperienceRowCard
          item={item}
          category={categories.get(item.category_id)}
          saved
          onToggleSave={(next) => favorites.setSaved(item.id, next)}
          onPress={() => router.push({ pathname: '/experience/[id]', params: { id: item.id } })}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
      refreshControl={
        <RefreshControl
          refreshing={plans.isRefetching}
          onRefresh={() => void plans.refetch()}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="heart-outline"
          title="Aún no guardas planes"
          description="Toca el corazón en un plan para guardarlo y encontrarlo aquí."
          actionLabel="Explorar planes"
          onAction={() => router.navigate('/explore')}
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: screenMargin, paddingTop: spacing.md, flexGrow: 1 },
  skeletons: { paddingHorizontal: screenMargin, paddingTop: spacing.md, gap: spacing.md },
  gap: { height: spacing.md },
})
