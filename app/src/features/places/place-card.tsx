import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/ui/cover-image'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { categoryIcon, type Category } from '@/features/categories/api'
import { formatDistanceKm } from '@/lib/format'
import { colors, elevation, shape, spacing } from '@/theme/tokens'

import type { Place } from './api'

type Props = { place: Place; category: Category | undefined; width?: number }

/** Recommended place (informational; places have no detail screen in the MVP). */
export function PlaceCard({ place, category, width = 240 }: Props) {
  const distance = formatDistanceKm(place.distance_km)
  return (
    <View
      style={[styles.card, { width }]}
      accessible
      accessibilityLabel={[
        place.name,
        category?.name,
        place.comuna,
        distance ? `a ${distance}` : null,
        place.description,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <View style={styles.clip}>
        <CoverImage
          uri={place.photo_url}
          fallbackIcon={categoryIcon(category)}
          scrim="bottom"
          recyclingKey={place.id}
          style={styles.image}
        >
          {distance ? (
            <View style={styles.badge}>
              <Badge label={distance} tone="glass" icon="navigate" />
            </View>
          ) : null}
        </CoverImage>
        <View style={styles.body}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {place.name}
          </Text>
          <View style={styles.row}>
            <Icon name="location-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {place.comuna}
              {category ? ` · ${category.name}` : ''}
            </Text>
          </View>
          {place.tags.length > 0 ? (
            <View style={styles.tags}>
              {place.tags.slice(0, 2).map((t) => (
                <Badge key={t} label={t} tone="neutral" />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: shape.card, backgroundColor: colors.surface, ...elevation[1] },
  clip: { borderRadius: shape.card, overflow: 'hidden' },
  image: { height: 140 },
  badge: { position: 'absolute', left: spacing.md, bottom: spacing.md },
  body: { padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  tags: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xxs, flexWrap: 'wrap' },
})
