import { StyleSheet, View } from 'react-native'

import { colors, elevation, radius, spacing } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Option<T extends string> = { value: T; label: string; icon?: IconName }

type Props<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  accessibilityLabel: string
  /** 'brand' = selected option filled green; 'stretch' = full width with equal options. */
  tone?: 'neutral' | 'brand'
  stretch?: boolean
}

/** Compact pill toggle (Explore list / map). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  tone = 'neutral',
  stretch = false,
}: Props<T>) {
  const brand = tone === 'brand'
  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic={!selected}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            style={[
              styles.option,
              stretch && styles.stretch,
              selected && (brand ? styles.selectedBrand : styles.selected),
            ]}
          >
            {o.icon ? (
              <Icon
                name={o.icon}
                size={16}
                color={selected ? (brand ? 'onPrimary' : 'textPrimary') : 'textSecondary'}
              />
            ) : null}
            <Text
              variant="subhead"
              color={selected ? (brand ? 'onPrimary' : 'textPrimary') : 'textSecondary'}
            >
              {o.label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: spacing.xxs + 1,
  },
  option: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  stretch: { flex: 1, minHeight: 40 },
  selected: { backgroundColor: colors.surface, ...elevation[1] },
  selectedBrand: { backgroundColor: colors.primary, ...elevation[1] },
})
