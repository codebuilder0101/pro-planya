import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/ui/cover-image'
import { HeartButton } from '@/components/ui/heart-button'
import { CARD_ROLE, PressableScale } from '@/components/ui/pressable-scale'
import { Rating } from '@/components/ui/rating'
import { Text } from '@/components/ui/text'
import { categoryIcon, type Category } from '@/features/categories/api'
import { formatPlanDate } from '@/lib/dates'
import { formatDistanceKm, formatPrice, formatSeatsLeft, seatsLeft } from '@/lib/format'
import { colors, elevation, shape, spacing, typography } from '@/theme/tokens'

import type { ExperienceCard as Experience } from '../api'

type Props = {
  item: Experience
  category: Category | undefined
  saved: boolean
  onToggleSave: (next: boolean) => void
  onPress: () => void
  /** 'carousel' = fixed width in horizontal lists; 'wide' = full width (Explore list). */
  variant?: 'carousel' | 'wide'
  width?: number
  testID?: string
}

/** The status badge on the photo: one at a time, most important first. */
export function statusBadge(item: Pick<Experience, 'capacity' | 'seats_taken' | 'is_featured'>) {
  const left = seatsLeft(item.capacity, item.seats_taken)
  if (left === 0) return { label: 'Agotado', tone: 'dark' as const, icon: undefined }
  if (item.is_featured) return { label: 'Destacado', tone: 'accent' as const, icon: 'flash' as const }
  if (left <= 3)
    return {
      label: formatSeatsLeft(item.capacity, item.seats_taken),
      tone: 'glass' as const,
      icon: undefined,
    }
  return null
}

export function ExperienceCard({
  item,
  category,
  saved,
  onToggleSave,
  onPress,
  variant = 'carousel',
  width = 280,
  testID,
}: Props) {
  const start = new Date(item.starts_at)
  const date = formatPlanDate(start)
  const price = formatPrice(item.is_free, item.price_clp)
  const distance = formatDistanceKm(item.distance_km)
  const badge = statusBadge(item)
  const imageHeight = variant === 'wide' ? 196 : 168

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
      accessibilityRole={CARD_ROLE}
      accessibilityLabel={a11y}
      accessibilityHint="Abre el detalle del plan"
      style={[styles.card, variant === 'wide' ? styles.wide : { width }]}
    >
      <View style={styles.clip}>
        <CoverImage
          uri={item.cover_url}
          fallbackIcon={categoryIcon(category)}
          scrim="bottom"
          recyclingKey={item.id}
          style={{ height: imageHeight }}
        >
          <View style={styles.topRow}>
            {badge ? <Badge label={badge.label} tone={badge.tone} icon={badge.icon} /> : <View />}
            <HeartButton saved={saved} onToggle={onToggleSave} size={36} />
          </View>
          <View style={styles.bottomRow}>
            <Badge label={date} tone="glass" icon="calendar-clear-outline" />
            {distance ? <Badge label={distance} tone="onImage" icon="navigate" /> : null}
          </View>
        </CoverImage>

        <View style={styles.body}>
          {category ? (
            <Text variant="overline" color="textBrand" numberOfLines={1}>
              {category.name.toUpperCase()}
            </Text>
          ) : null}
          <Text
            variant="headline"
            numberOfLines={2}
            style={variant === 'carousel' ? styles.carouselTitle : null}
          >
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {item.comuna}
            </Text>
          </View>
          <View style={styles.footer}>
            <View style={styles.priceRow}>
              <Text variant="bodyStrong" color={item.is_free ? 'textBrand' : 'textPrimary'}>
                {price}
              </Text>
              {!item.is_free && item.price_clp != null ? (
                <Text variant="caption" color="textSecondary">
                  / persona
                </Text>
              ) : null}
            </View>
            <Rating average={item.rating_avg} count={item.rating_count} />
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    ...elevation[2],
  },
  wide: { alignSelf: 'stretch' },
  clip: { borderRadius: shape.card, overflow: 'hidden' },
  topRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bottomRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  body: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.xs },
  /** Room for two lines so cards in a row keep the same height. */
  carouselTitle: { minHeight: typography.headline.lineHeight * 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  footer: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
})
