import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/ui/cover-image'
import { Icon, type IconName } from '@/components/ui/icon'
import { CARD_ROLE, PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { categoryIcon, type Category } from '@/features/categories/api'
import { formatPlanDate } from '@/lib/dates'
import { formatPrice } from '@/lib/format'
import { colors, elevation, radius, shape, spacing } from '@/theme/tokens'

import type { MyExperience } from '../api'

type Tone = 'brand' | 'neutral' | 'dark'

/** What the host sees about a plan: Publicado / Oculto / Cancelado / Retirado / Finalizado. */
export function planState(e: Pick<MyExperience, 'status' | 'ends_at'>, now: number) {
  const ended = new Date(e.ends_at).getTime() <= now
  if (e.status === 'cancelled') return { label: 'Cancelado', tone: 'dark' as Tone, editable: false }
  if (e.status === 'removed')
    return { label: 'Retirado por moderación', tone: 'dark' as Tone, editable: false }
  if (ended) return { label: 'Finalizado', tone: 'neutral' as Tone, editable: false }
  if (e.status === 'hidden') return { label: 'Oculto', tone: 'neutral' as Tone, editable: true }
  return { label: 'Publicado', tone: 'brand' as Tone, editable: true }
}

type Props = {
  item: MyExperience
  category: Category | undefined
  now: number
  busy?: boolean
  onOpen: () => void
  onEdit: () => void
  onToggleHidden: () => void
  onCancel: () => void
}

function Action({
  icon,
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  icon: IconName
  label: string
  onPress: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, disabled ? styles.disabled : null]}
    >
      <Icon name={icon} size={16} color={danger ? 'danger' : 'textBrand'} />
      <Text variant="subhead" color={danger ? 'danger' : 'textBrand'} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  )
}

export function MyPlanCard({
  item,
  category,
  now,
  busy = false,
  onOpen,
  onEdit,
  onToggleHidden,
  onCancel,
}: Props) {
  const state = planState(item, now)
  const date = formatPlanDate(new Date(item.starts_at))
  const people = Math.min(item.seats_taken, item.capacity)

  return (
    <View style={styles.card}>
      <PressableScale
        onPress={onOpen}
        scaleTo={0.985}
        accessibilityRole={CARD_ROLE}
        accessibilityLabel={`${item.title}, ${state.label}, ${date}, ${people} de ${item.capacity} inscritos`}
        accessibilityHint="Abre el plan"
        style={styles.main}
      >
        <View style={styles.imageClip}>
          <CoverImage
            uri={item.cover_url}
            fallbackIcon={categoryIcon(category)}
            recyclingKey={item.id}
            style={styles.image}
          />
        </View>
        <View style={styles.body}>
          <Badge label={state.label} tone={state.tone} />
          <Text variant="bodyStrong" numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.meta}>
            <Icon name="calendar-clear-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {date} · {item.comuna}
            </Text>
          </View>
          <View style={styles.meta}>
            <Icon name="people-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {people}/{item.capacity} inscritos · {formatPrice(item.is_free, item.price_clp)}
            </Text>
          </View>
        </View>
      </PressableScale>
      {state.editable ? (
        <View style={styles.actions}>
          <Action icon="create-outline" label="Editar" onPress={onEdit} disabled={busy} />
          <View style={styles.divider} />
          <Action
            icon={item.status === 'hidden' ? 'eye-outline' : 'eye-off-outline'}
            label={item.status === 'hidden' ? 'Mostrar' : 'Ocultar'}
            onPress={onToggleHidden}
            disabled={busy}
          />
          <View style={styles.divider} />
          <Action icon="close-circle-outline" label="Cancelar" onPress={onCancel} danger disabled={busy} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: shape.card, backgroundColor: colors.surface, ...elevation[2] },
  main: { flexDirection: 'row', gap: spacing.md, padding: spacing.sm },
  imageClip: { width: 96, borderRadius: radius.md, overflow: 'hidden' },
  image: { flex: 1, minHeight: 112 },
  body: { flex: 1, gap: spacing.xs, paddingVertical: spacing.xxs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingRight: spacing.sm },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  shrink: { flexShrink: 1 },
  disabled: { opacity: 0.5 },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.border },
})
