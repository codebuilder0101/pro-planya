import { useEffect } from 'react'
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { colors, motion, radius as radii } from '@/theme/tokens'

type Props = {
  width?: DimensionValue
  height: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

/** Loading placeholder (used instead of spinners). Static when reduced motion is on. */
export function Skeleton({ width = '100%', height, radius = radii.md, style }: Props) {
  const reducedMotion = useReducedMotion()
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (reducedMotion) return
    opacity.set(withRepeat(withTiming(0.45, { duration: motion.duration.slow * 2 }), -1, true))
    return () => cancelAnimation(opacity)
  }, [opacity, reducedMotion])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }))

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.skeleton },
        animatedStyle,
        style,
      ]}
    />
  )
}
