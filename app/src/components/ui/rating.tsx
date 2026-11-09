import { StyleSheet, View } from 'react-native'

import { formatRating } from '@/lib/format'
import { spacing } from '@/theme/tokens'

import { Icon } from './icon'
import { Text } from './text'

type Props = {
  average: number
  count: number
  /** Show "(24 reseñas)" instead of "(24)". */
  long?: boolean
  size?: 'sm' | 'md'
}

/** ★ 4,8 (24). Plans without reviews show "Nuevo". */
export function Rating({ average, count, long = false, size = 'sm' }: Props) {
  const label =
    count > 0
      ? `${formatRating(average)} de 5, ${count} ${count === 1 ? 'reseña' : 'reseñas'}`
      : 'Plan nuevo, sin reseñas'
  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <Icon name="star" size={size === 'md' ? 18 : 14} color="rating" />
      {count > 0 ? (
        <>
          <Text variant={size === 'md' ? 'bodyStrong' : 'captionStrong'}>{formatRating(average)}</Text>
          <Text variant={size === 'md' ? 'footnote' : 'caption'} color="textSecondary">
            {long ? `(${count} ${count === 1 ? 'reseña' : 'reseñas'})` : `(${count})`}
          </Text>
        </>
      ) : (
        <Text variant={size === 'md' ? 'subhead' : 'captionStrong'} color="textSecondary">
          Nuevo
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
})
