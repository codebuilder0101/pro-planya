import { useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PlansMap } from '@/components/map/plans-map'
import { useTabBarSpace } from '@/components/navigation/tab-screen'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { InlineError } from '@/components/ui/inline-error'
import { SearchField } from '@/components/ui/search-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { categoryIcon, useCategories, useCategoryMap } from '@/features/categories/api'
import {
  flattenPages,
  useExperienceSearch,
  type ExperienceCard as Experience,
} from '@/features/experiences/api'
import { ExperienceRowCard } from '@/features/experiences/components/experience-row-card'
import { useFavorites } from '@/features/experiences/use-favorites'
import {
  activeFilterCount,
  activeFilterLabels,
  exploreFilters,
  SORT_OPTIONS,
  toSearchArgs,
  useExploreFilters,
} from '@/features/explore/filters'
import { useMyProfile } from '@/features/profile/api'
import { formatPrice } from '@/lib/format'
import { useViewerLocation } from '@/lib/location'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { colors, elevation, radius, screenMargin, shape, spacing } from '@/theme/tokens'

type View_ = 'list' | 'map'

const openPlan = (id: string) => router.push({ pathname: '/experience/[id]', params: { id } })

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ view?: string; focus?: string }>()
  const view: View_ = params.view === 'map' ? 'map' : 'list'
  const insets = useSafeAreaInsets()
  const bottomSpace = useTabBarSpace()
  const queryClient = useQueryClient()

  const filters = useExploreFilters()
  const profile = useMyProfile()
  const { location } = useViewerLocation(profile.data?.city ?? null)
  const origin = location ? { lat: location.lat, lng: location.lng } : undefined
  const query = useDebouncedValue(filters.query, 300)
  const args = toSearchArgs({ ...filters, query }, origin)
  const search = useExperienceSearch(args, { enabled: origin != null })
  const items = flattenPages(search.data)

  const categories = useCategories()
  const categoryMap = useCategoryMap()
  const favorites = useFavorites()
  const filterCount = activeFilterCount(filters)
  const activeLabels = activeFilterLabels(filters)

  // Focus the search box when arriving from the Home search bar.
  const inputRef = useRef<TextInputInstance>(null)
  useEffect(() => {
    if (params.focus === '1') {
      const t = setTimeout(() => inputRef.current?.focus(), 350)
      router.setParams({ focus: undefined })
      return () => clearTimeout(t)
    }
  }, [params.focus])

  // Sticky header: the large title shrinks while the list scrolls.
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y)
  })
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.get(), [0, 60], [1, 0.72], Extrapolation.CLAMP) }],
  }))
  const titleRowStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.get(), [0, 60], [44, 40], Extrapolation.CLAMP),
  }))
  const headerShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, 24], [0, 1], Extrapolation.CLAMP),
  }))

  const toggleCategory = (id: string) => {
    const has = filters.categoryIds.includes(id)
    exploreFilters.set({
      categoryIds: has ? filters.categoryIds.filter((c) => c !== id) : [...filters.categoryIds, id],
    })
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? ''
  const resultLabel = search.isPending
    ? 'Buscando planes…'
    : `${items.length}${search.hasNextPage ? '+' : ''} ${items.length === 1 ? 'plan' : 'planes'} · ${sortLabel}`

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Animated.View style={[styles.headerShadow, headerShadowStyle]} pointerEvents="none" />
      <Animated.View style={[styles.titleRow, view === 'list' ? titleRowStyle : null]}>
        <Animated.View style={[styles.titleWrap, view === 'list' ? titleStyle : null]}>
          <Text variant="title1" accessibilityRole="header">
            Explorar planes
          </Text>
        </Animated.View>
        <View>
          <IconButton
            icon="options-outline"
            variant="surface"
            accessibilityLabel={filterCount > 0 ? `Filtros, ${filterCount} activos` : 'Filtros'}
            onPress={() => router.push('/explore-filters')}
          />
          {filterCount > 0 ? (
            <View style={styles.filterCount} pointerEvents="none">
              <Text variant="captionStrong" color="onPrimary">
                {filterCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
      <SearchField
        ref={inputRef}
        testID="explore-search"
        value={filters.query}
        onChangeText={(text) => exploreFilters.set({ query: text })}
        placeholder="Busca trekking, café, música…"
      />
      <View style={styles.segmented}>
        <SegmentedControl
          accessibilityLabel="Ver como"
          tone="brand"
          stretch
          value={view}
          onChange={(v) => router.setParams({ view: v })}
          options={[
            { value: 'list', label: 'Lista', icon: 'list' },
            { value: 'map', label: 'Mapa', icon: 'map-outline' },
          ]}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label="Todas"
          selected={filters.categoryIds.length === 0}
          onPress={() => exploreFilters.set({ categoryIds: [] })}
        />
        {(categories.data ?? []).map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            icon={categoryIcon(c)}
            iconColor={colors.textBrand}
            selected={filters.categoryIds.includes(c.id)}
            onPress={() => toggleCategory(c.id)}
          />
        ))}
      </ScrollView>
      {activeLabels.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.activeScroll}
          keyboardShouldPersistTaps="handled"
        >
          {activeLabels.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              icon="close"
              selected
              accessibilityLabel={`Quitar filtro ${f.label}`}
              onPress={() => exploreFilters.set(f.clear)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  )

  const clearFilters = () => exploreFilters.reset()

  if (view === 'map') {
    return (
      <View style={styles.root}>
        {header}
        <MapResults
          items={items}
          origin={origin}
          radiusKm={filters.radiusKm ?? 15}
          showsUser={location?.source === 'device'}
          isPending={search.isPending}
          bottomSpace={bottomSpace}
          categoryMap={categoryMap}
          favorites={favorites}
          resultLabel={resultLabel}
        />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {header}
      <Animated.FlatList
        data={items}
        keyExtractor={(i) => i.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomSpace }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['experiences', 'list', 'search'] })}
        refreshing={search.isRefetching && !search.isFetchingNextPage}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage()
        }}
        ListHeaderComponent={
          <Text
            variant="footnote"
            color="textSecondary"
            style={styles.resultLabel}
            accessibilityLiveRegion="polite"
          >
            {resultLabel}
          </Text>
        }
        ListEmptyComponent={
          search.isPending ? (
            <ListSkeleton />
          ) : search.error ? (
            <InlineError error={search.error} onRetry={() => void search.refetch()} inset={0} />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No encontramos planes"
              description={
                filterCount > 0 || filters.query
                  ? 'Prueba con otra búsqueda o quita algunos filtros.'
                  : 'Todavía no hay planes publicados en tu zona. ¡Vuelve pronto!'
              }
              actionLabel={filterCount > 0 || filters.query ? 'Limpiar filtros' : undefined}
              onAction={filterCount > 0 || filters.query ? clearFilters : undefined}
            />
          )
        }
        ListFooterComponent={
          search.isFetchingNextPage ? (
            <View style={styles.footer}>
              <Skeleton height={152} radius={shape.card} />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <ExperienceRowCard
            item={item}
            category={categoryMap.get(item.category_id)}
            saved={favorites.ids.has(item.id)}
            onToggleSave={(next) => favorites.setSaved(item.id, next)}
            onPress={() => openPlan(item.id)}
          />
        )}
      />
    </View>
  )
}

function ListSkeleton() {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2, 3].map((n) => (
        <Skeleton key={n} height={152} radius={shape.card} />
      ))}
    </View>
  )
}

function MapResults({
  items,
  origin,
  radiusKm,
  showsUser,
  isPending,
  bottomSpace,
  categoryMap,
  favorites,
  resultLabel,
}: {
  items: Experience[]
  origin: { lat: number; lng: number } | undefined
  radiusKm: number
  showsUser: boolean
  isPending: boolean
  bottomSpace: number
  categoryMap: ReturnType<typeof useCategoryMap>
  favorites: ReturnType<typeof useFavorites>
  resultLabel: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((i) => i.id === selectedId) ?? null

  return (
    <View style={styles.mapArea}>
      {origin ? (
        <PlansMap
          pins={items.map((e) => ({
            id: e.id,
            lat: e.lat,
            lng: e.lng,
            label: formatPrice(e.is_free, e.price_clp),
          }))}
          center={origin}
          radiusKm={radiusKm}
          showsUser={showsUser}
          selectedId={selectedId}
          onSelectPin={setSelectedId}
          bottomInset={bottomSpace}
          accessibilityLabel="Mapa de planes"
        />
      ) : (
        <Skeleton height={400} radius={0} />
      )}
      <View style={styles.mapPill} pointerEvents="none">
        <Text variant="captionStrong">{isPending ? 'Buscando planes…' : resultLabel}</Text>
      </View>
      {selected ? (
        <View style={[styles.mapCard, { bottom: bottomSpace - spacing.md }]}>
          <ExperienceRowCard
            item={selected}
            category={categoryMap.get(selected.category_id)}
            saved={favorites.ids.has(selected.id)}
            onToggleSave={(next) => favorites.setSaved(selected.id, next)}
            onPress={() => openPlan(selected.id)}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: screenMargin,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    zIndex: 2,
  },
  headerShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.background,
    ...elevation[4],
  },
  titleRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleWrap: { transformOrigin: 'left center' },
  chipsScroll: { marginTop: spacing.md, marginHorizontal: -screenMargin },
  chips: { gap: spacing.sm, paddingHorizontal: screenMargin },
  filterCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: { marginTop: spacing.md },
  activeScroll: { marginTop: spacing.sm, marginHorizontal: -screenMargin },
  listContent: { paddingHorizontal: screenMargin, paddingTop: spacing.sm },
  resultLabel: { marginBottom: spacing.md },
  footer: { marginTop: spacing.lg },
  skeletons: { gap: spacing.md },
  mapArea: { flex: 1 },
  mapPill: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    ...elevation[2],
  },
  mapCard: { position: 'absolute', left: screenMargin, right: screenMargin },
})
