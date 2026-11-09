import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, screenMargin, spacing } from '@/theme/tokens'

import { TAB_BAR_HEIGHT } from './floating-tab-bar'

/** Bottom space so content is never hidden behind the floating tab bar. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets()
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.xl
}

type Props = {
  children: ReactNode
  scroll?: boolean
  contentStyle?: StyleProp<ViewStyle>
}

/** Root container for tab screens (safe area top + room for the floating tab bar). */
export function TabScreen({ children, scroll = true, contentStyle }: Props) {
  const insets = useSafeAreaInsets()
  const bottomSpace = useTabBarSpace()

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: bottomSpace }]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: bottomSpace },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: screenMargin },
})
