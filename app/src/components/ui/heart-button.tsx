import * as Haptics from 'expo-haptics'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { colors, elevation, minTapTarget, motion } from '@/theme/tokens'

import { Icon } from './icon'
import { PressableScale } from './pressable-scale'

type Props = {
  saved: boolean
  onToggle: (next: boolean) => void
  /** 'glass' over photos, 'surface' on sheets, 'plain' (icon only) inside list cards. */
  variant?: 'glass' | 'surface' | 'plain'
  size?: number
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Save / unsave a plan: a springy "pop" + haptic on save (static when reduced motion is on). */
export function HeartButton({
  saved,
  onToggle,
  variant = 'glass',
  size = 40,
  disabled = false,
  style,
  testID,
}: Props) {
  const reducedMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))

  const handlePress = () => {
    const next = !saved
    if (next) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined)
      if (!reducedMotion) {
        scale.set(
          withSequence(
            withTiming(0.7, { duration: motion.duration.fast / 2 }),
            withSpring(1.25, motion.spring.bouncy),
            withSpring(1, motion.spring.gentle),
          ),
        )
      }
    } else {
      Haptics.selectionAsync().catch(() => undefined)
    }
    onToggle(next)
  }

  return (
    <PressableScale
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      scaleTo={0.9}
      hitSlop={Math.max(0, Math.ceil((minTapTarget - size) / 2))}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Quitar de guardados' : 'Guardar plan'}
      accessibilityState={{ selected: saved, disabled }}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'plain'
          ? null
          : [{ backgroundColor: variant === 'glass' ? colors.glass : colors.surface }, elevation[2]],
        style,
      ]}
    >
      <Animated.View style={iconStyle}>
        <Icon
          name={saved ? 'heart' : 'heart-outline'}
          size={Math.round(size * (variant === 'plain' ? 0.62 : 0.5))}
          color={saved ? 'favorite' : variant === 'plain' ? 'textSecondary' : 'textPrimary'}
        />
      </Animated.View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
})
