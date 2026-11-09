import { useState } from 'react'
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/ui/cover-image'
import { HeartButton } from '@/components/ui/heart-button'
import { Icon } from '@/components/ui/icon'
import { CARD_ROLE, PressableScale } from '@/components/ui/pressable-scale'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { categoryIcon, type Category } from '@/features/categories/api'
import { formatPlanDate } from '@/lib/dates'
import { formatPrice, formatSeatsLeft, formatSeatsTaken } from '@/lib/format'
import { colors, radius, screenMargin, shape, spacing } from '@/theme/tokens'

import type { ExperienceCard } from '../api'

/** Landscape hero (about 4:3 on phones), clamped for small and large screens. */
const heroHeight = (cardWidth: number) => Math.round(Math.min(Math.max(cardWidth * 0.76, 264), 340))
const GAP = spacing.md

type Props = {
  items: ExperienceCard[]
  categories: Map<string, Category>
  favoriteIds: Set<string>
  onToggleSave: (id: string, next: boolean) => void
  onOpen: (id: string) => void
}

/** Edge-to-edge featured plans with a gradient overlay, swipeable with page dots. */
export function FeaturedCarousel({ items, categories, favoriteIds, onToggleSave, onOpen }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth - screenMargin * 2
  const [index, setIndex] = useState(0)

  return (
    <View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + GAP}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP)))}
        renderItem={({ item }) => {
          const category = categories.get(item.category_id)
          return (
            <PressableScale
              onPress={() => onOpen(item.id)}
              scaleTo={0.985}
              accessibilityRole={CARD_ROLE}
              accessibilityLabel={`Destacado: ${item.title}, ${formatPlanDate(new Date(item.starts_at))}, ${item.comuna}, ${formatPrice(item.is_free, item.price_clp)}, ${formatSeatsLeft(item.capacity, item.seats_taken)}`}
              accessibilityHint="Abre el detalle del plan"
              style={[styles.card, { width: cardWidth }]}
            >
              <CoverImage
                uri={item.cover_url}
                fallbackIcon={categoryIcon(category)}
                scrim="strong"
                recyclingKey={item.id}
                style={{ height: heroHeight(cardWidth) }}
              >
                <View style={styles.top}>
                  {category ? (
                    <Badge label={category.name} tone="glass" icon={categoryIcon(category)} />
                  ) : (
                    <View />
                  )}
                  <HeartButton
                    saved={favoriteIds.has(item.id)}
                    onToggle={(next) => onToggleSave(item.id, next)}
                  />
                </View>
                <View style={styles.bottom}>
                  <Badge label="Destacado" tone="accent" icon="flash" />
                  <Text variant="title2" color="textOnImage" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Icon name="calendar-clear-outline" size={15} color="textOnImage" />
                    <Text variant="subhead" color="textOnImage" numberOfLines={1}>
                      {formatPlanDate(new Date(item.starts_at))}
                    </Text>
                    <Text variant="subhead" color="textOnImage">
                      ·
                    </Text>
                    <Icon name="location-outline" size={15} color="textOnImage" />
                    <Text variant="subhead" color="textOnImage" numberOfLines={1} style={styles.flex}>
                      {item.comuna}
                    </Text>
                  </View>
                  <View style={styles.ctaRow}>
                    <View style={styles.ctaInfo}>
                      <View style={styles.seats}>
                        <Icon name="people" size={15} color="textOnImage" />
                        <Text variant="captionStrong" color="textOnImage">
                          {formatSeatsTaken(item.capacity, item.seats_taken)}
                        </Text>
                      </View>
                      <Badge label={formatPrice(item.is_free, item.price_clp)} tone="glass" />
                    </View>
                    <View style={styles.arrow}>
                      <Icon name="arrow-forward" size={20} color="onPrimary" />
                    </View>
                  </View>
                </View>
              </CoverImage>
            </PressableScale>
          )
        }}
      />
      {items.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {items.map((i, n) => (
            <View key={i.id} style={[styles.dot, n === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function FeaturedCarouselSkeleton() {
  const { width } = useWindowDimensions()
  const cardWidth = width - screenMargin * 2
  return (
    <View style={styles.list}>
      <Skeleton width={cardWidth} height={heroHeight(cardWidth)} radius={shape.cardLarge} />
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: screenMargin },
  card: { borderRadius: shape.cardLarge, overflow: 'hidden', backgroundColor: colors.surfaceBrandStrong },
  top: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottom: {
    position: 'absolute',
    left: spacing.lgPlus,
    right: spacing.lgPlus,
    bottom: spacing.lgPlus,
    gap: spacing.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, opacity: 0.92 },
  flex: { flexShrink: 1 },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  ctaInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  seats: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs + 2, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.borderStrong },
  dotActive: { width: 20, backgroundColor: colors.primary },
})
