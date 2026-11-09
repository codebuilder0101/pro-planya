import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import { colors, elevation, minTapTarget, type ColorToken } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'

type Variant = 'glass' | 'surface' | 'plain' | 'brand'

const VARIANTS: Record<Variant, { bg: ColorToken | null; fg: ColorToken; shadow: boolean }> = {
  /** Over photos: frosted white circle with a soft shadow. */
  glass: { bg: 'glass', fg: 'textPrimary', shadow: true },
  surface: { bg: 'surface', fg: 'textPrimary', shadow: true },
  plain: { bg: null, fg: 'textPrimary', shadow: false },
  brand: { bg: 'primarySoft', fg: 'textBrandStrong', shadow: false },
}

type Props = {
  icon: IconName
  accessibilityLabel: string
  onPress?: () => void
  variant?: Variant
  /** Visual diameter; the touch target is always at least 44 pt. */
  size?: number
  iconSize?: number
  iconColor?: ColorToken
  haptic?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'surface',
  size = 40,
  iconSize = 20,
  iconColor,
  haptic = false,
  disabled = false,
  style,
  testID,
}: Props) {
  const v = VARIANTS[variant]
  const slop = Math.max(0, Math.ceil((minTapTarget - size) / 2))
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      scaleTo={0.9}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        v.bg ? { backgroundColor: colors[v.bg] } : null,
        v.shadow ? elevation[2] : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={iconColor ?? v.fg} />
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
})
