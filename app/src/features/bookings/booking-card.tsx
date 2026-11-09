import type { ReactNode } from 'react'
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

import type { MyBooking } from './api'

type Tone = 'brand' | 'neutral' | 'dark'

/** What the explorer sees about a booking. */
export function bookingState(b: MyBooking, now: number) {
  const e = b.experience
  if (e.status === 'cancelled') return { label: 'Plan cancelado', tone: 'dark' as Tone, active: false }
  if (new Date(e.ends_at).getTime() <= now)
    return { label: 'Finalizado', tone: 'neutral' as Tone, active: false }
  const started = new Date(e.starts_at).getTime() <= now
  return { label: started ? 'En curso' : 'Confirmada', tone: 'brand' as Tone, active: !started }
}

type Props = {
  booking: MyBooking
  category: Category | undefined
  now: number
  busy?: boolean
  onOpen: () => void
  onMessage: () => void
  onCancel: () => void
  /** Extra action for past plans (reviews). */
  footer?: ReactNode
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

export function BookingCard({
  booking,
  category,
  now,
  busy = false,
  onOpen,
  onMessage,
  onCancel,
  footer,
}: Props) {
  const e = booking.experience
  const state = bookingState(booking, now)
  const date = formatPlanDate(new Date(e.starts_at))
  const seats = booking.seats === 1 ? '1 cupo' : `${booking.seats} cupos`

  return (
    <View style={styles.card}>
      <PressableScale
        onPress={onOpen}
        scaleTo={0.985}
        accessibilityRole={CARD_ROLE}
        accessibilityLabel={`${e.title}, ${state.label}, ${date}, ${seats}`}
        accessibilityHint="Abre el plan"
        style={styles.main}
      >
        <View style={styles.imageClip}>
          <CoverImage
            uri={e.cover_url}
            fallbackIcon={categoryIcon(category)}
            recyclingKey={e.id}
            style={styles.image}
          />
        </View>
        <View style={styles.body}>
          <Badge label={state.label} tone={state.tone} />
          <Text variant="bodyStrong" numberOfLines={2}>
            {e.title}
          </Text>
          <View style={styles.meta}>
            <Icon name="calendar-clear-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {date} · {e.comuna}
            </Text>
          </View>
          <View style={styles.meta}>
            <Icon name="ticket-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {seats} · {formatPrice(e.is_free, e.price_clp)}
            </Text>
          </View>
        </View>
      </PressableScale>
      {state.active ? (
        <View style={styles.actions}>
          <Action icon="chatbubble-ellipses-outline" label="Escribir" onPress={onMessage} disabled={busy} />
          <View style={styles.divider} />
          <Action
            icon="close-circle-outline"
            label="Cancelar reserva"
            onPress={onCancel}
            danger
            disabled={busy}
          />
        </View>
      ) : footer ? (
        <View style={styles.actions}>{footer}</View>
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
  shrink: { flexShrink: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
  },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  disabled: { opacity: 0.5 },
})
