import { StyleSheet, View } from 'react-native'

import { spacing } from '@/theme/tokens'

import { IconButton } from './icon-button'
import { Text } from './text'

type Props = {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** Spoken label, e.g. "Cupos". */
  label: string
}

/** − 2 + counter (seats in the join sheet). */
export function Stepper({ value, min, max, onChange, label }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1)
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1)
      }}
    >
      <IconButton
        icon="remove"
        variant="brand"
        size={44}
        accessibilityLabel="Quitar uno"
        disabled={value <= min}
        haptic
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <Text variant="title2" style={styles.value}>
        {value}
      </Text>
      <IconButton
        icon="add"
        variant="brand"
        size={44}
        accessibilityLabel="Agregar uno"
        disabled={value >= max}
        haptic
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  value: { minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] },
})
