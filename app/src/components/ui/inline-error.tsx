import { StyleSheet, View } from 'react-native'

import { toUserMessage } from '@/lib/errors'
import { colors, screenMargin, shape, spacing } from '@/theme/tokens'

import { Icon } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Props = { error: unknown; onRetry: () => void; inset?: number }

/** Compact error card for one section of a screen, with a retry action. */
export function InlineError({ error, onRetry, inset = screenMargin }: Props) {
  return (
    <View style={[styles.card, { marginHorizontal: inset }]} accessibilityRole="alert">
      <Icon name="cloud-offline-outline" size={22} color="textSecondary" />
      <Text variant="footnote" color="textSecondary" style={styles.flex}>
        {toUserMessage(error)}
      </Text>
      <PressableScale
        onPress={onRetry}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
      >
        <Text variant="subhead" color="textBrand">
          Reintentar
        </Text>
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: shape.card,
    backgroundColor: colors.surfaceMuted,
  },
  flex: { flex: 1 },
})
