import { StyleSheet, View } from 'react-native'

import { Icon } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { spacing } from '@/theme/tokens'

import { RATING_LABELS } from './api'

type Props = { value: number; onChange: (value: number) => void }

/** Five tappable stars (1..5). */
export function StarInput({ value, onChange }: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Calificación">
      {RATING_LABELS.map((label, i) => {
        const n = i + 1
        const on = n <= value
        return (
          <PressableScale
            key={n}
            onPress={() => onChange(n)}
            haptic
            accessibilityRole="radio"
            accessibilityState={{ checked: n === value }}
            accessibilityLabel={`${n} de 5, ${label}`}
            style={styles.star}
            testID={`review-star-${n}`}
          >
            <Icon name={on ? 'star' : 'star-outline'} size={40} color={on ? 'rating' : 'textTertiary'} />
          </PressableScale>
        )
      })}
    </View>
  )
}

/** Read-only small stars for a review row. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.small} accessible accessibilityLabel={`${value} de 5 estrellas`}>
      {RATING_LABELS.map((_, i) => (
        <Icon
          key={i}
          name={i < value ? 'star' : 'star-outline'}
          size={size}
          color={i < value ? 'rating' : 'textTertiary'}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  star: { padding: spacing.xxs, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  small: { flexDirection: 'row', gap: 2 },
})
