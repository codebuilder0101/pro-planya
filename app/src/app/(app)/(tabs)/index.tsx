import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PlansMap } from '@/components/map/plans-map'
import { useTabBarSpace } from '@/components/navigation/tab-screen'
import { Avatar } from '@/components/ui/avatar'
import { BrandLogo } from '@/components/ui/brand-logo'
import { Badge } from '@/components/ui/badge'
import { Chip } from '@/components/ui/chip'
import { Icon } from '@/components/ui/icon'
import { InlineError } from '@/components/ui/inline-error'
import { PressableScale } from '@/components/ui/pressable-scale'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useCategories, useCategoryMap } from '@/features/categories/api'
import { CategoryTile } from '@/features/categories/category-tile'
import { useExperienceList, useNearbyExperiences } from '@/features/experiences/api'
import { ExperienceCarousel } from '@/features/experiences/components/experience-carousel'
import {
  FeaturedCarousel,
  FeaturedCarouselSkeleton,
} from '@/features/experiences/components/featured-carousel'
import { useFavorites } from '@/features/experiences/use-favorites'
import { exploreFilters, type ExploreFilters } from '@/features/explore/filters'
import { usePlaces } from '@/features/places/api'
import { PlaceCard } from '@/features/places/place-card'
import { useMyProfile } from '@/features/profile/api'
import { formatPrice } from '@/lib/format'
import { useViewerLocation } from '@/lib/location'
import { useWeather } from '@/lib/weather'
import { colors, elevation, screenMargin, shape, spacing } from '@/theme/tokens'

const NEARBY_RADIUS_KM = 10
const CATEGORY_TILE_WIDTH = 92

type QuickFilter = {
  key: string
  label: string
  icon: 'navigate' | 'today-outline' | 'calendar-outline' | 'pricetag-outline'
  filters: Partial<ExploreFilters>
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    key: 'near',
    label: 'Cerca de mí',
    icon: 'navigate',
    filters: { radiusKm: NEARBY_RADIUS_KM, sort: 'distance' },
  },
  { key: 'today', label: 'Hoy', icon: 'today-outline', filters: { date: 'today' } },
  { key: 'weekend', label: 'Este finde', icon: 'calendar-outline', filters: { date: 'weekend' } },
  { key: 'free', label: 'Gratis', icon: 'pricetag-outline', filters: { freeOnly: true } },
]

const openPlan = (id: string) => router.push({ pathname: '/experience/[id]', params: { id } })

function openExplore(filters: Partial<ExploreFilters> = {}, view: 'list' | 'map' = 'list') {
  exploreFilters.reset(filters)
  router.navigate({ pathname: '/explore', params: { view } })
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const bottomSpace = useTabBarSpace()
  const queryClient = useQueryClient()

  const profile = useMyProfile()
  const city = profile.data?.city ?? null
  const interests = profile.data?.interests ?? []
  const firstName = profile.data?.full_name.trim().split(/\s+/)[0] ?? ''

  const { location, requestPermission } = useViewerLocation(city)
  const origin = location ? { lat: location.lat, lng: location.lng } : undefined
  const weather = useWeather(origin)
  const categories = useCategories()
  const categoryMap = useCategoryMap()
  const favorites = useFavorites()

  const featured = useExperienceList(
    'featured',
    { p_featured_only: true, p_lat: origin?.lat ?? null, p_lng: origin?.lng ?? null, p_limit: 6 },
    { enabled: origin != null },
  )
  const forYou = useExperienceList(
    'for-you',
    {
      p_category_ids: interests.length > 0 ? [...interests].sort() : null,
      p_sort: interests.length > 0 ? 'soonest' : 'popular',
      p_lat: origin?.lat ?? null,
      p_lng: origin?.lng ?? null,
    },
    { enabled: origin != null && profile.data != null },
  )
  const nearby = useNearbyExperiences(origin, NEARBY_RADIUS_KM)
  const places = usePlaces(origin)

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['experiences'] }),
      queryClient.invalidateQueries({ queryKey: ['places'] }),
      queryClient.invalidateQueries({ queryKey: ['weather'] }),
    ]).finally(() => setRefreshing(false))
  }

  // Status bar backdrop fades in once content scrolls under it.
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y)
  })
  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(scrollY.get() / 24, 0), 1) }))

  const usingCity = location?.source === 'city'

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: bottomSpace }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Brand + avatar */}
        <View style={styles.topBar}>
          <BrandLogo />
          <PressableScale
            onPress={() => router.navigate('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Ir a mi perfil"
          >
            <Avatar uri={profile.data?.avatar_url} name={profile.data?.full_name} size={44} />
          </PressableScale>
        </View>

        {/* Location + weather, greeting */}
        <View style={styles.header}>
          <View style={styles.cityRow}>
            <View style={styles.city}>
              <Icon name="location-outline" size={16} color="textBrand" />
              <Text variant="subhead" color="textPrimary" numberOfLines={1} style={styles.flexShrink}>
                {city ? `${city}, Araucanía` : 'La Araucanía'}
              </Text>
            </View>
            {weather.data ? (
              <View
                style={styles.weather}
                accessible
                accessibilityLabel={`Clima: ${weather.data.label}, ${weather.data.temperatureC} grados`}
              >
                <Icon name={weather.data.icon} size={18} color="highlight" />
                <Text variant="subhead">{weather.data.temperatureC}°</Text>
              </View>
            ) : null}
          </View>
          {profile.isPending ? (
            <>
              <Skeleton width={220} height={30} />
              <Skeleton width={280} height={16} />
            </>
          ) : (
            <>
              <Text variant="title1" accessibilityRole="header" numberOfLines={1}>
                {firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'}
              </Text>
              <Text variant="body" color="textSecondary">
                Descubre planes, vive experiencias y conecta con personas de tu zona.
              </Text>
            </>
          )}
        </View>

        {/* Search + quick filters */}
        <View style={styles.searchBlock}>
          <PressableScale
            onPress={() => {
              exploreFilters.reset()
              router.navigate({ pathname: '/explore', params: { focus: '1' } })
            }}
            scaleTo={0.98}
            accessibilityRole="search"
            accessibilityLabel="Buscar planes"
            style={styles.search}
          >
            <Icon name="search" size={20} color="textSecondary" />
            <Text variant="body" color="textSecondary" style={styles.flex} numberOfLines={1}>
              ¿Qué plan quieres vivir hoy?
            </Text>
            <View style={styles.searchFilter}>
              <Icon name="options-outline" size={18} color="onPrimary" />
            </View>
          </PressableScale>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            {QUICK_FILTERS.map((q) => (
              <Chip key={q.key} label={q.label} icon={q.icon} onPress={() => openExplore(q.filters)} />
            ))}
          </ScrollView>
        </View>

        {/* Featured hero */}
        <View style={styles.section}>
          {featured.isPending ? (
            <FeaturedCarouselSkeleton />
          ) : featured.error ? (
            <InlineError error={featured.error} onRetry={() => void featured.refetch()} />
          ) : featured.data && featured.data.length > 0 ? (
            <FeaturedCarousel
              items={featured.data}
              categories={categoryMap}
              favoriteIds={favorites.ids}
              onToggleSave={favorites.setSaved}
              onOpen={openPlan}
            />
          ) : null}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <SectionHeader
            title="Explora por categoría"
            actionLabel="Ver todas"
            onAction={() => openExplore()}
          />
          {categories.isPending ? (
            <View style={styles.rowSkeleton}>
              {Array.from({ length: 4 }, (_, n) => (
                <Skeleton key={n} width={CATEGORY_TILE_WIDTH} height={84} radius={shape.card} />
              ))}
            </View>
          ) : categories.error ? (
            <InlineError error={categories.error} onRetry={() => void categories.refetch()} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {(categories.data ?? []).map((c) => (
                <CategoryTile
                  key={c.id}
                  category={c}
                  width={CATEGORY_TILE_WIDTH}
                  onPress={() => openExplore({ categoryIds: [c.id] })}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Nearby: map preview + list */}
        <View style={styles.section}>
          <SectionHeader
            title="Planes cerca de ti"
            icon="location-outline"
            subtitle={usingCity ? `Cerca de ${city ?? 'Temuco'}` : `A menos de ${NEARBY_RADIUS_KM} km de ti`}
            actionLabel="Ver todos"
            onAction={() => openExplore({ radiusKm: NEARBY_RADIUS_KM, sort: 'distance' })}
          />
          <ExperienceCarousel
            testID="home-nearby"
            items={nearby.data}
            isPending={nearby.isPending}
            error={nearby.error}
            onRetry={() => void nearby.refetch()}
            categories={categoryMap}
            favoriteIds={favorites.ids}
            onToggleSave={favorites.setSaved}
            onOpen={openPlan}
            empty={{
              icon: 'navigate-outline',
              title: `Nada a menos de ${NEARBY_RADIUS_KM} km`,
              description: 'Amplía la distancia para ver más planes de la zona.',
              actionLabel: 'Ver planes a 50 km',
              onAction: () => openExplore({ radiusKm: 50, sort: 'distance' }),
            }}
          />
          <PressableScale
            onPress={() => openExplore({ radiusKm: NEARBY_RADIUS_KM, sort: 'distance' }, 'map')}
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={`Abrir el mapa. ${nearby.data?.length ?? 0} planes cerca`}
            style={styles.mapCard}
          >
            <View style={styles.mapClip} pointerEvents="none">
              {origin ? (
                <PlansMap
                  pins={(nearby.data ?? []).map((e) => ({
                    id: e.id,
                    lat: e.lat,
                    lng: e.lng,
                    label: formatPrice(e.is_free, e.price_clp),
                  }))}
                  center={origin}
                  radiusKm={4}
                  interactive={false}
                  showsUser={location?.source === 'device'}
                  accessibilityLabel="Mapa de planes cercanos"
                />
              ) : (
                <Skeleton height={176} radius={0} />
              )}
              <View style={styles.mapFooter}>
                <Badge
                  label={nearby.isPending ? 'Buscando…' : `${nearby.data?.length ?? 0} planes cerca`}
                  tone="glass"
                  icon="map-outline"
                />
                <View style={styles.mapButton}>
                  <Text variant="subhead" color="onPrimary">
                    Abrir mapa
                  </Text>
                  <Icon name="arrow-forward" size={16} color="onPrimary" />
                </View>
              </View>
            </View>
          </PressableScale>
          {usingCity && location?.canAsk ? (
            <PressableScale
              onPress={() => void requestPermission()}
              accessibilityRole="button"
              accessibilityLabel="Usar mi ubicación actual para ver planes cercanos"
              style={styles.useLocation}
            >
              <Icon name="navigate" size={16} color="textBrand" />
              <Text variant="subhead" color="textBrand">
                Usar mi ubicación actual
              </Text>
            </PressableScale>
          ) : null}
        </View>

        {/* Para ti */}
        <View style={styles.section}>
          <SectionHeader
            title="Para ti"
            subtitle={interests.length > 0 ? 'Según tus intereses' : 'Los más populares'}
            actionLabel="Ver todo"
            onAction={() =>
              openExplore(interests.length > 0 ? { categoryIds: interests } : { sort: 'popular' })
            }
          />
          <ExperienceCarousel
            testID="home-for-you"
            items={forYou.data}
            isPending={forYou.isPending}
            error={forYou.error}
            onRetry={() => void forYou.refetch()}
            categories={categoryMap}
            favoriteIds={favorites.ids}
            onToggleSave={favorites.setSaved}
            onOpen={openPlan}
            empty={{
              icon: 'sparkles-outline',
              title: 'Aún no hay planes para ti',
              description: 'Prueba con otros intereses o revisa todos los planes.',
              actionLabel: 'Explorar planes',
              onAction: () => openExplore(),
            }}
          />
        </View>

        {/* Places */}
        <View style={styles.section}>
          <SectionHeader title="Lugares que vale la pena" subtitle="Recomendados en La Araucanía" />
          {places.isPending ? (
            <View style={styles.rowSkeleton}>
              <Skeleton width={240} height={220} radius={shape.card} />
              <Skeleton width={240} height={220} radius={shape.card} />
            </View>
          ) : places.error ? (
            <InlineError error={places.error} onRetry={() => void places.refetch()} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              decelerationRate="fast"
              snapToInterval={240 + spacing.md}
            >
              {(places.data ?? []).map((p) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  category={p.category_id ? categoryMap.get(p.category_id) : undefined}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[styles.statusBackdrop, { height: insets.top }, backdropStyle]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenMargin,
    marginBottom: spacing.md,
  },
  header: { paddingHorizontal: screenMargin, marginBottom: spacing.lg, gap: spacing.xs },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  city: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: shape.chip,
    backgroundColor: colors.surface,
    ...elevation[1],
  },
  searchBlock: { marginBottom: spacing.xl },
  search: {
    marginHorizontal: screenMargin,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    ...elevation[2],
  },
  searchFilter: {
    width: 40,
    height: 40,
    borderRadius: shape.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: { marginTop: spacing.md },
  chips: { gap: spacing.sm, paddingHorizontal: screenMargin },
  section: { marginBottom: spacing.xxl },
  mapCard: {
    marginHorizontal: screenMargin,
    marginTop: spacing.xs,
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    ...elevation[2],
  },
  mapClip: { height: 176, borderRadius: shape.card, overflow: 'hidden' },
  mapFooter: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: shape.chip,
    backgroundColor: colors.primary,
  },
  rowSkeleton: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: screenMargin, overflow: 'hidden' },
  hList: { gap: spacing.md, paddingHorizontal: screenMargin, paddingBottom: spacing.sm },
  categoryList: { gap: spacing.sm, paddingHorizontal: screenMargin, paddingVertical: spacing.xs },
  useLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    marginHorizontal: screenMargin,
    marginTop: spacing.xs,
  },
  statusBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    ...elevation[1],
  },
})
