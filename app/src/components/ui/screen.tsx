import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context'

import { colors, screenMargin, spacing } from '@/theme/tokens'

type Props = {
  children: ReactNode
  /** Scrollable content that stays visible above the keyboard (forms). */
  scroll?: boolean
  /** Safe-area edges to pad. Screens under a header usually skip 'top'. */
  edges?: Edge[]
  /** Apply the 16pt side margins. */
  padded?: boolean
  /** Fixed content at the bottom (primary action), above the safe area. */
  footer?: ReactNode
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  padded = true,
  footer,
  contentStyle,
  testID,
}: Props) {
  const insets = useSafeAreaInsets()
  const pad = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }
  const bottomInset = edges.includes('bottom') ? insets.bottom : 0
  const horizontal = padded ? { paddingHorizontal: screenMargin } : null

  return (
    <View style={[styles.root, pad]} testID={testID}>
      {scroll ? (
        <KeyboardAwareScrollView
          bottomOffset={spacing.xl}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            horizontal,
            { paddingBottom: footer ? spacing.xl : bottomInset + spacing.xl },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.flex, horizontal, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, horizontal, { paddingBottom: bottomInset + spacing.lg }]}>{footer}</View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: spacing.lg },
  footer: { paddingTop: spacing.md, backgroundColor: colors.background },
})
