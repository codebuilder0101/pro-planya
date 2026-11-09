import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, minTapTarget, shape, spacing, type ColorToken } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, { bg: ColorToken | null; fg: ColorToken; border: ColorToken | null }> = {
  primary: { bg: 'primary', fg: 'onPrimary', border: null },
  secondary: { bg: 'surface', fg: 'textBrand', border: 'borderStrong' },
  ghost: { bg: null, fg: 'textBrand', border: null },
  danger: { bg: 'danger', fg: 'textInverse', border: null },
}

export type ButtonProps = {
  label: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  icon?: IconName
  fullWidth?: boolean
  haptic?: boolean
  accessibilityHint?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  haptic = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const v = VARIANTS[variant]
  const inactive = disabled || loading

  return (
    <PressableScale
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        fullWidth && styles.fullWidth,
        v.bg ? { backgroundColor: colors[v.bg] } : null,
        v.border ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors[v.border] } : null,
        disabled && !loading ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.fg]} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={20} color={v.fg} /> : null}
          <Text variant="button" color={v.fg} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTapTarget,
    borderRadius: shape.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  md: { minHeight: minTapTarget, paddingVertical: spacing.sm },
  lg: { minHeight: 54, paddingVertical: spacing.md },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.45 },
})
