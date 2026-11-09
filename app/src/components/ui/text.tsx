import { Text as RNText, type TextProps as RNTextProps } from 'react-native'

import { colors, typography, type ColorToken, type TypographyToken } from '@/theme/tokens'

export type TextProps = RNTextProps & {
  variant?: TypographyToken
  color?: ColorToken
  align?: 'left' | 'center' | 'right'
}

/** The only text component in the app: typography and colors come from tokens. */
export function Text({ variant = 'body', color = 'textPrimary', align, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[typography[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
    />
  )
}
