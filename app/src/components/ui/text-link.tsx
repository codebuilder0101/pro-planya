import { Link, type Href } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'

import { minTapTarget, spacing, type TypographyToken } from '@/theme/tokens'

import { Text } from './text'

type Props = {
  href: Href
  label: string
  variant?: TypographyToken
  replace?: boolean
}

/** Inline navigation link with a 44pt tap target. */
export function TextLink({ href, label, variant = 'subhead', replace }: Props) {
  return (
    <Link href={href} replace={replace} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label} hitSlop={4} style={styles.link}>
        <Text variant={variant} color="textBrand">
          {label}
        </Text>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  link: { minHeight: minTapTarget, justifyContent: 'center', paddingHorizontal: spacing.xxs },
})
