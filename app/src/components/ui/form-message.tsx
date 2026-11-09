import { StyleSheet, View } from 'react-native'

import { colors, radius, spacing } from '@/theme/tokens'

import { Icon } from './icon'
import { Text } from './text'

type Props = { tone: 'error' | 'success' | 'info'; message: string | null | undefined }

/** Inline, announced message for form-level errors or confirmations. */
export function FormMessage({ tone, message }: Props) {
  if (!message) return null
  const style = tone === 'error' ? styles.error : tone === 'success' ? styles.success : styles.info
  return (
    <View style={[styles.base, style]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Icon
        name={
          tone === 'error' ? 'alert-circle' : tone === 'success' ? 'checkmark-circle' : 'information-circle'
        }
        size={20}
        color={tone === 'error' ? 'danger' : 'success'}
      />
      <Text variant="callout" style={styles.text}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  error: { backgroundColor: colors.dangerSoft },
  success: { backgroundColor: colors.successSoft },
  info: { backgroundColor: colors.surfaceBrand },
  text: { flex: 1 },
})
