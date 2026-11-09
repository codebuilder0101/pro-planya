import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/ui/cover-image'
import { HeartButton } from '@/components/ui/heart-button'
import { Icon, type IconName } from '@/components/ui/icon'
import { CARD_ROLE, PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { categoryIcon, type Category } from '@/features/categories/api'
import { formatPlanDate } from '@/lib/dates'
import { formatDistanceKm, formatPrice, formatSeatsLeft, formatSeatsTaken, seatsLeft } from '@/lib/format'
import { colors, elevation, radius, shape, spacing } from '@/theme/tokens'

import type { ExperienceCard as Experience } from '../api'

import { statusBadge } from './experience-card'

const IMAGE_WIDTH = 128

type Props = {
  item: Omit<Experience, 'lat' | 'lng'>
  category: Category | undefined
  saved: boolean
  onToggleSave: (next: boolean) => void
  onPress: () => void
  testID?: string
}

function Meta({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={14} color="textSecondary" />
      <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
        {label}
      </Text>
    </View>
  )
}

/** Compact horizontal plan card (Explore list and map): photo left, details right. */
export function ExperienceRowCard({ item, category, saved, onToggleSave, onPress, testID }: Props) {
  const date = formatPlanDate(new Date(item.starts_at))
  const price = formatPrice(item.is_free, item.price_clp)
  const distance = formatDistanceKm(item.distance_km)
  const place = distance ? `${item.comuna} · ${distance}` : item.comuna
  const seats = formatSeatsTaken(item.capacity, item.seats_taken)
  const badge = statusBadge(item)
  // The photo is narrow here: "Últimos 3" instead of "Quedan 3 cupos".
  const left = seatsLeft(item.capacity, item.seats_taken)
  const badgeLabel =
    badge?.tone === 'glass' ? (left === 1 ? 'Último cupo' : `Últimos ${left}`) : (badge?.label ?? '')

  const a11y = [
    item.title,
    category?.name,
    date,
    item.comuna,
    distance ? `a ${distance}` : null,
    price,
    formatSeatsLeft(item.capacity, item.seats_taken),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole={CARD_ROLE}
      accessibilityLabel={a11y}
      accessibilityHint="Abre el detalle del plan"
      style={styles.card}
    >
      <View style={styles.imageClip}>
        <CoverImage
          uri={item.cover_url}
          fallbackIcon={categoryIcon(category)}
          recyclingKey={item.id}
          style={styles.image}
        >
          {badge ? (
            <View style={styles.badge}>
              <Badge label={badgeLabel} tone={badge.tone} icon={badge.icon} />
            </View>
          ) : null}
        </CoverImage>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          {category ? (
            <View style={styles.category}>
              <Icon name={categoryIcon(category)} size={14} color="textBrand" />
              <Text variant="captionStrong" color="textBrand" numberOfLines={1} style={styles.flex}>
                {category.name}
              </Text>
            </View>
          ) : (
            <View style={styles.flex} />
          )}
          <HeartButton saved={saved} onToggle={onToggleSave} variant="plain" size={32} />
        </View>
        <Text variant="bodyStrong" numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metas}>
          <Meta icon="calendar-clear-outline" label={date} />
          <Meta icon="location-outline" label={place} />
        </View>
        <View style={styles.footer}>
          <Meta icon="people-outline" label={seats} />
          <View style={styles.price}>
            <Text variant="captionStrong" color="textBrandStrong">
              {price}
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    ...elevation[2],
  },
  imageClip: { width: IMAGE_WIDTH, borderRadius: radius.md, overflow: 'hidden' },
  image: { flex: 1, minHeight: 136 },
  badge: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm },
  body: { flex: 1, gap: spacing.xs, paddingVertical: spacing.xxs, paddingRight: spacing.xxs },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xxs },
  category: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metas: { gap: spacing.xxs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  flex: { flexShrink: 1 },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  price: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
})
