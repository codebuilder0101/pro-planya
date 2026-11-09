import { StyleSheet } from 'react-native'

import { colors, minTapTarget, radius, spacing } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Props = {
  label: string
  selected?: boolean
  onPress?: () => void
  icon?: IconName
  /** Data-driven accent (category color) for the icon when not selected. */
  iconColor?: string
  accessibilityLabel?: string
  testID?: string
}

/** Pill-shaped filter/selection chip. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  iconColor,
  accessibilityLabel,
  testID,
}: Props) {
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={selected ? 'onPrimary' : 'textSecondary'}
          rawColor={selected ? undefined : iconColor}
        />
      ) : null}
      <Text variant="subhead" color={selected ? 'onPrimary' : 'textPrimary'} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTapTarget - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  selected: { backgroundColor: colors.primary },
  unselected: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
})
