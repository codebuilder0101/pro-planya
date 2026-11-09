import { StyleSheet, View } from 'react-native'

import { colors, spacing } from '@/theme/tokens'

import { Button } from './button'
import { Icon, type IconName } from './icon'
import { Text } from './text'

type Props = {
  icon: IconName
  title: string
  description?: string
  /** One action at most (design rule). */
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.iconCircle}>
        <Icon name={icon} size={32} color="textBrand" />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="callout" color="textSecondary" align="center">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="md"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: { marginTop: spacing.md },
})
