import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, radius, spacing, type ColorToken } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { Text } from './text'

type Tone = 'glass' | 'onImage' | 'accent' | 'brand' | 'neutral' | 'dark'

const TONES: Record<Tone, { bg: ColorToken; fg: ColorToken; border?: ColorToken }> = {
  /** Frosted white pill over photos (dark text). */
  glass: { bg: 'glass', fg: 'textPrimary' },
  /** Translucent pill over photos (white text). */
  onImage: { bg: 'glassOnImage', fg: 'textOnImage', border: 'glassBorderOnImage' },
  accent: { bg: 'accent', fg: 'onAccent' },
  brand: { bg: 'primarySoft', fg: 'textBrandStrong' },
  neutral: { bg: 'surfaceMuted', fg: 'textSecondary' },
  dark: { bg: 'surfaceInverse', fg: 'textInverse' },
}

type Props = {
  label: string
  tone?: Tone
  icon?: IconName
  style?: StyleProp<ViewStyle>
}

/** Small status / meta pill (Destacado, Últimos cupos, 2,4 km...). Not interactive. */
export function Badge({ label, tone = 'glass', icon, style }: Props) {
  const t = TONES[tone]
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors[t.bg] },
        t.border ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors[t.border] } : null,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={13} color={t.fg} /> : null}
      <Text variant="captionStrong" color={t.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
})
