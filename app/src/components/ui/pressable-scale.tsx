import * as Haptics from 'expo-haptics'
import type { ReactNode } from 'react'
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { motion } from '@/theme/tokens'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  /** Scale while pressed (motion token by default). */
  scaleTo?: number
  /** Light haptic on press (join, favorite...). */
  haptic?: boolean
}

/** Press feedback used by cards and buttons. Respects the system reduced-motion setting. */
export function PressableScale({
  scaleTo = motion.pressScale,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!reducedMotion) scale.set(withSpring(scaleTo, motion.spring.press))
    onPressIn?.(e)
  }
  const handlePressOut = (e: GestureResponderEvent) => {
    if (!reducedMotion) scale.set(withSpring(1, motion.spring.press))
    onPressOut?.(e)
  }
  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    onPress?.(e)
  }

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  )
}

/**
 * Role for a pressable card that contains other buttons (e.g. a heart). On web (design previews only)
 * nested buttons are invalid HTML, so the card drops the role there; native keeps it.
 */
export const CARD_ROLE = Platform.OS === 'web' ? undefined : ('button' as const)
