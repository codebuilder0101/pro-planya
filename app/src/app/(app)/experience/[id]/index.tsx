import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { Alert, FlatList, Platform, Share, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  Extrapolation,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PlansMap } from '@/components/map/plans-map'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CoverImage } from '@/components/ui/cover-image'
import { EmptyState } from '@/components/ui/empty-state'
import { HeartButton } from '@/components/ui/heart-button'
import { Icon, type IconName } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Rating } from '@/components/ui/rating'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { categoryIcon, useCategoryMap } from '@/features/categories/api'
import {
  useCancelBooking,
  useExperience,
  useExperiencePhotos,
  useParticipants,
  type ExperienceDetail,
} from '@/features/experiences/api'
import { statusBadge } from '@/features/experiences/components/experience-card'
import { useFavorites } from '@/features/experiences/use-favorites'
import { useMyProfile, useUserId } from '@/features/profile/api'
import { capitalize, formatDuration, formatLongDate, formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/errors'
import { formatDistanceKm, formatPrice, formatSeatsLeft, seatsLeft } from '@/lib/format'
import { useViewerLocation } from '@/lib/location'
import { colors, elevation, radius, screenMargin, shape, spacing } from '@/theme/tokens'

const HERO_HEIGHT = 380
const BAR_HEIGHT = 56

export default function ExperienceDetailScreen() {
  const { id = '', published } = useLocalSearchParams<{ id: string; published?: string }>()
  const insets = useSafeAreaInsets()
  const profile = useMyProfile()
  const { location } = useViewerLocation(profile.data?.city ?? null)
  const origin = location ? { lat: location.lat, lng: location.lng } : undefined
  const experience = useExperience(id, origin)

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y)
  })
  const collapseAt = HERO_HEIGHT - insets.top - BAR_HEIGHT - spacing.xl

  // Sticky header: a solid bar with the title fades in as the photo scrolls away.
  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [collapseAt - 40, collapseAt], [0, 1], Extrapolation.CLAMP),
  }))
  // Pull-down stretch on the photo.
  const heroStyle = useAnimatedStyle(() => {
    const y = scrollY.get()
    return {
      transform: [{ translateY: y < 0 ? y / 2 : y * 0.35 }, { scale: y < 0 ? 1 + -y / HERO_HEIGHT : 1 }],
    }
  })

  const e = experience.data
  const title = e?.title ?? ''

  return (
    <View style={styles.root}>
      {experience.isPending ? (
        <DetailSkeleton />
      ) : experience.error ? (
        <View style={[styles.center, { paddingTop: insets.top + BAR_HEIGHT }]}>
          <EmptyState
            icon="cloud-offline-outline"
            title="No pudimos cargar el plan"
            description={toUserMessage(experience.error)}
            actionLabel="Reintentar"
            onAction={() => void experience.refetch()}
          />
        </View>
      ) : !e ? (
        <View style={[styles.center, { paddingTop: insets.top + BAR_HEIGHT }]}>
          <EmptyState
            icon="eye-off-outline"
            title="Este plan ya no está disponible"
            description="Puede que el anfitrión lo haya ocultado o cancelado."
            actionLabel="Explorar otros planes"
            onAction={() => router.navigate('/explore')}
          />
        </View>
      ) : (
        <>
          <Animated.ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          >
            <Animated.View style={heroStyle}>
              <Gallery experience={e} />
            </Animated.View>
            <Content experience={e} />
          </Animated.ScrollView>
          <BookingBar experience={e} />
          {published === '1' ? <PublishedBanner /> : null}
        </>
      )}

      {/* Floating top bar (always visible) */}
      <View style={[styles.topBar, { paddingTop: insets.top, height: insets.top + BAR_HEIGHT }]}>
        <Animated.View style={[styles.topBarBg, headerBgStyle]} pointerEvents="none" />
        <IconButton
          icon="chevron-back"
          variant="glass"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Animated.View style={[styles.topTitle, headerBgStyle]} pointerEvents="none">
          <Text variant="bodyStrong" numberOfLines={1} align="center">
            {title}
          </Text>
        </Animated.View>
        {e ? <TopActions experience={e} /> : <View style={styles.topActions} />}
      </View>
    </View>
  )
}

function TopActions({ experience: e }: { experience: ExperienceDetail }) {
  const favorites = useFavorites()
  const share = () => {
    const url = Linking.createURL(`/experience/${e.id}`)
    Share.share(
      Platform.OS === 'ios'
        ? { message: `${e.title} en PlanYá`, url }
        : { message: `${e.title} en PlanYá\n${url}` },
    ).catch(() => undefined)
  }
  return (
    <View style={styles.topActions}>
      <IconButton icon="share-outline" variant="glass" accessibilityLabel="Compartir plan" onPress={share} />
      <HeartButton saved={favorites.ids.has(e.id)} onToggle={(next) => favorites.setSaved(e.id, next)} />
    </View>
  )
}

// ---------------------------------------------------------------- gallery
function Gallery({ experience: e }: { experience: ExperienceDetail }) {
  const { width } = useWindowDimensions()
  const photos = useExperiencePhotos(e.id)
  const categoryMap = useCategoryMap()
  const [page, setPage] = useState(0)
  const urls = photos.data && photos.data.length > 0 ? photos.data.map((p) => p.url) : [e.cover_url]

  return (
    <View style={{ height: HERO_HEIGHT }}>
      <FlatList
        data={urls}
        keyExtractor={(u, i) => `${i}:${u ?? 'none'}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(ev) => setPage(Math.round(ev.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <CoverImage
            uri={item}
            fallbackIcon={categoryIcon(categoryMap.get(e.category_id))}
            scrim="bottom"
            style={{ width, height: HERO_HEIGHT }}
            accessibilityLabel={`Foto ${index + 1} de ${urls.length}: ${e.title}`}
          />
        )}
      />
      {urls.length > 1 ? (
        <View style={styles.pageBadge} pointerEvents="none">
          <Badge label={`${page + 1}/${urls.length}`} tone="onImage" icon="images-outline" />
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------- content
function Content({ experience: e }: { experience: ExperienceDetail }) {
  const categoryMap = useCategoryMap()
  const category = categoryMap.get(e.category_id)
  const start = new Date(e.starts_at)
  const end = new Date(e.ends_at)
  const badge = statusBadge(e)
  const distance = formatDistanceKm(e.distance_km)
  const left = seatsLeft(e.capacity, e.seats_taken)

  return (
    <View style={styles.sheet}>
      <View style={styles.badges}>
        {category ? <Badge label={category.name} tone="brand" icon={categoryIcon(category)} /> : null}
        {badge ? <Badge label={badge.label} tone={badge.tone} icon={badge.icon} /> : null}
      </View>
      <Text variant="title2" accessibilityRole="header">
        {e.title}
      </Text>
      <View style={styles.ratingRow}>
        <Rating average={e.rating_avg} count={e.rating_count} long />
        <Text variant="caption" color="textTertiary">
          ·
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flexShrink}>
          {e.comuna}
          {distance ? ` · a ${distance}` : ''}
        </Text>
      </View>

      <View style={styles.facts}>
        <Fact
          icon="calendar-clear-outline"
          title={capitalize(formatLongDate(start))}
          subtitle={`${formatTimeRange(start, end)} · ${formatDuration(start, end)}`}
        />
        <Fact
          icon="location-outline"
          title={e.comuna}
          subtitle={distance ? `A ${distance} de ti` : 'La Araucanía'}
        />
        <Fact
          icon="people-outline"
          title={formatSeatsLeft(e.capacity, e.seats_taken)}
          subtitle={`${e.seats_taken} de ${e.capacity} cupos tomados`}
        >
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (e.seats_taken / Math.max(e.capacity, 1)) * 100)}%` },
                left <= 3 ? styles.progressHot : null,
              ]}
            />
          </View>
        </Fact>
      </View>

      <HostCard experience={e} />

      <Section title="Sobre el plan">
        <ExpandableText text={e.description} />
        {e.source_name ? (
          <Text variant="caption" color="textTertiary">
            Fuente: {e.source_name}
          </Text>
        ) : null}
      </Section>

      <Participants id={e.id} />

      <Section title="Punto de encuentro">
        <View style={styles.mapCard}>
          <View style={styles.mapClip} pointerEvents="none">
            <PlansMap
              pins={[{ id: e.id, lat: e.lat, lng: e.lng, label: e.comuna }]}
              center={{ lat: e.lat, lng: e.lng }}
              radiusKm={1.2}
              interactive={false}
              selectedId={e.id}
              accessibilityLabel={`Mapa del punto de encuentro en ${e.comuna}`}
            />
          </View>
          <PressableScale
            onPress={() => openDirections(e)}
            accessibilityRole="button"
            accessibilityLabel="Cómo llegar, abre la app de mapas"
            style={styles.directions}
          >
            <Icon name="navigate-circle-outline" size={22} color="textBrand" />
            <Text variant="subhead" color="textBrand" style={styles.flex}>
              Cómo llegar
            </Text>
            <Icon name="open-outline" size={16} color="textTertiary" />
          </PressableScale>
        </View>
      </Section>
    </View>
  )
}

function openDirections(e: Pick<ExperienceDetail, 'lat' | 'lng' | 'title'>) {
  const label = encodeURIComponent(e.title)
  const url =
    Platform.OS === 'ios'
      ? `maps:?q=${label}&ll=${e.lat},${e.lng}`
      : Platform.OS === 'android'
        ? `geo:${e.lat},${e.lng}?q=${e.lat},${e.lng}(${label})`
        : `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`),
  )
}

function Fact({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: IconName
  title: string
  subtitle: string
  children?: ReactNode
}) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon name={icon} size={20} color="textBrandStrong" />
      </View>
      <View style={styles.factText}>
        <Text variant="subhead">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {subtitle}
        </Text>
        {children}
      </View>
    </View>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  )
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 280
  return (
    <View style={styles.gapXs}>
      <Text variant="callout" color="textSecondary" numberOfLines={expanded || !long ? undefined : 5}>
        {text}
      </Text>
      {long ? (
        <PressableScale
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Leer menos' : 'Leer más'}
        >
          <Text variant="subhead" color="textBrand">
            {expanded ? 'Leer menos' : 'Leer más'}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  )
}

function HostCard({ experience: e }: { experience: ExperienceDetail }) {
  return (
    <View style={styles.hostCard}>
      <Avatar uri={e.host_avatar_url} name={e.host_full_name} size={52} />
      <View style={styles.flex}>
        <Text variant="caption" color="textSecondary">
          Organiza
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {e.host_full_name}
        </Text>
        {e.host_bio ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {e.host_bio}
          </Text>
        ) : null}
      </View>
      <Badge label="Anfitrión" tone="brand" icon="shield-checkmark-outline" />
    </View>
  )
}

function Participants({ id }: { id: string }) {
  const participants = useParticipants(id)
  const list = participants.data ?? []
  if (participants.isPending) return <Skeleton height={40} width={200} />
  if (list.length === 0) return null
  const people = list.reduce((n, p) => n + p.seats, 0)
  return (
    <Section title="Quiénes van">
      <View style={styles.participants}>
        <View style={styles.avatarStack}>
          {list.slice(0, 5).map((p, i) => (
            <View
              key={p.user_id}
              style={[styles.stackItem, { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }]}
            >
              <Avatar uri={p.avatar_url} name={p.full_name} size={36} />
            </View>
          ))}
        </View>
        <Text variant="footnote" color="textSecondary" style={styles.flex}>
          {people === 1 ? '1 persona va' : `${people} personas van`}
        </Text>
      </View>
    </Section>
  )
}

// ---------------------------------------------------------------- booking bar
function BookingBar({ experience: e }: { experience: ExperienceDetail }) {
  const insets = useSafeAreaInsets()
  const userId = useUserId()
  const cancel = useCancelBooking(e.id)
  const left = seatsLeft(e.capacity, e.seats_taken)
  // Read the clock once per mount (render must stay pure).
  const [mountedAt] = useState(() => Date.now())
  const started = new Date(e.starts_at).getTime() <= mountedAt
  const isHost = e.host_id === userId
  const joined = e.my_booking_id != null

  const confirmCancel = () => {
    const bookingId = e.my_booking_id
    if (!bookingId) return
    Alert.alert('¿Cancelar tu reserva?', 'Liberaremos tus cupos para que otra persona pueda unirse.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: () =>
          cancel.mutate(bookingId, {
            onError: (error) => Alert.alert('No pudimos cancelar', toUserMessage(error)),
          }),
      },
    ])
  }

  let action: ReactNode
  if (e.status === 'cancelled') action = <Button label="Plan cancelado" disabled fullWidth={false} />
  else if (isHost && new Date(e.ends_at).getTime() > mountedAt && e.status !== 'removed')
    action = (
      <Button
        label="Editar plan"
        icon="create-outline"
        variant="secondary"
        fullWidth={false}
        testID="edit-plan"
        onPress={() => router.push({ pathname: '/plan/[id]/edit', params: { id: e.id } })}
      />
    )
  else if (started) action = <Button label="Ya comenzó" disabled fullWidth={false} />
  else if (isHost) action = <Button label="Es tu plan" variant="secondary" disabled fullWidth={false} />
  else if (joined)
    action = (
      <Button
        label="Cancelar"
        variant="secondary"
        onPress={confirmCancel}
        loading={cancel.isPending}
        fullWidth={false}
      />
    )
  else if (left === 0) action = <Button label="Sin cupos" disabled fullWidth={false} />
  else
    action = (
      <Button
        label="Unirme"
        icon="add-circle-outline"
        haptic
        fullWidth={false}
        testID="join-button"
        onPress={() => router.push({ pathname: '/experience/[id]/join', params: { id: e.id } })}
      />
    )

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.flex}>
        {isHost ? (
          <>
            <Text variant="bodyStrong" color={e.status === 'hidden' ? 'textSecondary' : 'textBrand'}>
              {e.status === 'hidden' ? 'Oculto · solo tú lo ves' : 'Tu plan'}
            </Text>
            <Text variant="caption" color="textSecondary">
              {e.seats_taken === 1 ? '1 inscrito' : `${e.seats_taken} inscritos`} de {e.capacity} cupos
            </Text>
          </>
        ) : joined ? (
          <>
            <View style={styles.joinedRow}>
              <Icon name="checkmark-circle" size={18} color="success" />
              <Text variant="bodyStrong" color="textBrand">
                Estás inscrito
              </Text>
            </View>
            <Text variant="caption" color="textSecondary">
              {e.my_booking_seats === 1 ? '1 cupo reservado' : `${e.my_booking_seats ?? 0} cupos reservados`}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.priceRow}>
              <Text variant="title3" color={e.is_free ? 'textBrand' : 'textPrimary'}>
                {formatPrice(e.is_free, e.price_clp)}
              </Text>
              {!e.is_free ? (
                <Text variant="caption" color="textSecondary">
                  / persona
                </Text>
              ) : null}
            </View>
            <Text variant="caption" color={left <= 3 ? 'accent' : 'textSecondary'}>
              {formatSeatsLeft(e.capacity, e.seats_taken)}
            </Text>
          </>
        )}
      </View>
      {action}
    </View>
  )
}

/** Shown once after publishing (detail opened with ?published=1). */
function PublishedBanner() {
  const insets = useSafeAreaInsets()
  useEffect(() => {
    const t = setTimeout(() => router.setParams({ published: undefined }), 6000)
    return () => clearTimeout(t)
  }, [])
  return (
    <View
      style={[styles.publishedBanner, { bottom: 96 + Math.max(insets.bottom, spacing.md) }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Icon name="checkmark-circle" size={22} color="onPrimary" />
      <View style={styles.flex}>
        <Text variant="bodyStrong" color="onPrimary">
          ¡Tu plan ya está publicado!
        </Text>
        <Text variant="caption" color="onPrimary">
          Ya aparece en Inicio y Explorar para que la gente se sume.
        </Text>
      </View>
    </View>
  )
}

function DetailSkeleton() {
  return (
    <View>
      <Skeleton height={HERO_HEIGHT} radius={0} />
      <View style={[styles.sheet, styles.gapMd]}>
        <Skeleton width={100} height={24} radius={radius.pill} />
        <Skeleton width="85%" height={30} />
        <Skeleton width="50%" height={16} />
        <Skeleton height={180} radius={shape.card} />
        <Skeleton height={80} radius={shape.card} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  publishedBanner: {
    position: 'absolute',
    left: screenMargin,
    right: screenMargin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: shape.card,
    backgroundColor: colors.primary,
    ...elevation[3],
  },
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: screenMargin },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  gapXs: { gap: spacing.xs },
  gapMd: { gap: spacing.md },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenMargin,
  },
  topBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    ...elevation[4],
  },
  topTitle: { flex: 1, paddingHorizontal: spacing.xs },
  topActions: { flexDirection: 'row', gap: spacing.sm, minWidth: 40 },
  pageBadge: { position: 'absolute', right: screenMargin, bottom: spacing.xxl + spacing.md },
  sheet: {
    marginTop: -spacing.xl,
    borderTopLeftRadius: shape.sheet,
    borderTopRightRadius: shape.sheet,
    backgroundColor: colors.surface,
    paddingHorizontal: screenMargin,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  facts: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: shape.card,
    backgroundColor: colors.background,
  },
  fact: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  factIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factText: { flex: 1, gap: spacing.xxs, justifyContent: 'center', minHeight: 40 },
  progressTrack: {
    height: 6,
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.brandAccent },
  progressHot: { backgroundColor: colors.accent },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    ...elevation[2],
    marginVertical: spacing.sm,
  },
  section: { gap: spacing.sm, marginTop: spacing.md },
  participants: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarStack: { flexDirection: 'row' },
  stackItem: { borderRadius: 20, borderWidth: 2, borderColor: colors.surface },
  mapCard: { borderRadius: shape.card, backgroundColor: colors.surface, ...elevation[2] },
  mapClip: {
    height: 160,
    borderTopLeftRadius: shape.card,
    borderTopRightRadius: shape.card,
    overflow: 'hidden',
  },
  directions: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: screenMargin,
    backgroundColor: colors.surface,
    borderTopLeftRadius: shape.sheet,
    borderTopRightRadius: shape.sheet,
    ...elevation[4],
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  joinedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
})
