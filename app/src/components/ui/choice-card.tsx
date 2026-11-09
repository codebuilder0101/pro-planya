import { StyleSheet, View } from 'react-native'

import { colors, elevation, radius, spacing } from '@/theme/tokens'

import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Props = {
  title: string
  description: string
  icon: IconName
  selected: boolean
  onPress: () => void
  testID?: string
}

/** Large selectable card, used for "Explorador / Anfitrión" at sign-up. */
export function ChoiceCard({ title, description, icon, selected, onPress, testID }: Props) {
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ checked: selected }}
      style={[styles.card, selected ? styles.selected : styles.unselected]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Icon name={icon} size={24} color={selected ? 'onPrimary' : 'textBrand'} />
      </View>
      <View style={styles.texts}>
        <Text variant="headline">{title}</Text>
        <Text variant="footnote" color="textSecondary">
          {description}
        </Text>
      </View>
      <Icon
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? 'primary' : 'borderStrong'}
      />
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
  },
  selected: { borderColor: colors.primary, ...elevation[1] },
  unselected: { borderColor: colors.border },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: colors.primary },
  texts: { flex: 1, gap: spacing.xxs },
})
