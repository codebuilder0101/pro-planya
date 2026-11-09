import { StyleSheet, View } from 'react-native'

import { screenMargin, spacing } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Props = {
  title: string
  /** Small brand icon before the title (e.g. a pin for "Planes cerca de ti"). */
  icon?: IconName
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  /** Horizontal inset (screen margin by default; 0 when already inside padded content). */
  inset?: number
}

export function SectionHeader({ title, icon, subtitle, actionLabel, onAction, inset = screenMargin }: Props) {
  return (
    <View style={[styles.row, { paddingHorizontal: inset }]}>
      <View style={styles.titles}>
        <View style={styles.titleRow}>
          {icon ? <Icon name={icon} size={20} color="textBrand" /> : null}
          <Text variant="title3" accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={styles.action}
        >
          <Text variant="subhead" color="textBrand">
            {actionLabel}
          </Text>
          <Icon name="chevron-forward" size={16} color="textBrand" />
        </PressableScale>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titles: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: 24 },
})
