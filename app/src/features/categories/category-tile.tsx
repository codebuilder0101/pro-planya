import { StyleSheet } from 'react-native'

import { Icon } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { colors, elevation, shape, spacing } from '@/theme/tokens'

import { categoryIcon, type Category } from './api'

type Props = { category: Category; onPress: () => void; width: number }

/** White tile with the brand-green category icon (Home "Explora por categoría"). */
export function CategoryTile({ category, onPress, width }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver planes de ${category.name}`}
      style={[styles.tile, { width }]}
    >
      <Icon name={categoryIcon(category)} size={26} color="textBrand" />
      <Text variant="caption" align="center" numberOfLines={1} style={styles.label}>
        {category.name}
      </Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    ...elevation[1],
  },
  label: { alignSelf: 'stretch' },
})
