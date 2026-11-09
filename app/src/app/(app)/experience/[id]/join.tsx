import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Stepper } from '@/components/ui/stepper'
import { Text } from '@/components/ui/text'
import { useExperience, useJoinExperience } from '@/features/experiences/api'
import { useMyProfile } from '@/features/profile/api'
import { capitalize, formatLongDate, formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/errors'
import { formatCLP, formatSeatsLeft, seatsLeft } from '@/lib/format'
import { useViewerLocation } from '@/lib/location'
import { colors, radius, screenMargin, shape, spacing } from '@/theme/tokens'

/** Max seats per booking (matches join_experience's invalid_seats check). */
const MAX_SEATS_PER_BOOKING = 10

/** Join bottom sheet (native form sheet): choose seats, confirm, celebrate. */
export default function JoinSheet() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const reducedMotion = useReducedMotion()
  const profile = useMyProfile()
  const { location } = useViewerLocation(profile.data?.city ?? null)
  const experience = useExperience(id, location ? { lat: location.lat, lng: location.lng } : undefined)
  const join = useJoinExperience(id)
  const [seats, setSeats] = useState(1)
  const [done, setDone] = useState(false)

  const e = experience.data
  const left = e ? seatsLeft(e.capacity, e.seats_taken) : 0
  const maxSeats = Math.max(1, Math.min(MAX_SEATS_PER_BOOKING, left))
  const value = Math.min(seats, maxSeats)

  const confirm = () => {
    join.mutate(value, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
        setDone(true)
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined)
      },
    })
  }

  const padding = { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }

  if (done && e) {
    return (
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn}
        style={[styles.container, styles.center, padding]}
      >
        <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify()} style={styles.successIcon}>
          <Icon name="checkmark" size={40} color="onPrimary" />
        </Animated.View>
        <Text variant="title2" align="center" accessibilityRole="header">
          ¡Listo, estás dentro!
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Reservaste {value === 1 ? '1 cupo' : `${value} cupos`} para «{e.title}». Te esperamos el{' '}
          {formatLongDate(new Date(e.starts_at))}.
        </Text>
        <Button label="Listo" onPress={() => router.back()} style={styles.successButton} />
      </Animated.View>
    )
  }

  return (
    <View style={[styles.container, padding]}>
      <Text variant="title3" accessibilityRole="header">
        Unirme al plan
      </Text>

      {experience.isPending ? (
        <View style={styles.gap}>
          <Skeleton height={20} width="70%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={56} radius={shape.card} />
        </View>
      ) : !e ? (
        <FormMessage
          tone="error"
          message={experience.error ? toUserMessage(experience.error) : 'Este plan ya no está disponible.'}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {e.title}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {capitalize(formatLongDate(new Date(e.starts_at)))} ·{' '}
              {formatTimeRange(new Date(e.starts_at), new Date(e.ends_at))}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="subhead">Cupos</Text>
              <Text variant="caption" color={left <= 3 ? 'accent' : 'textSecondary'}>
                {formatSeatsLeft(e.capacity, e.seats_taken)}
              </Text>
            </View>
            <Stepper label="Cupos" value={value} min={1} max={maxSeats} onChange={setSeats} />
          </View>

          {!e.is_free && e.price_clp != null ? (
            <View style={[styles.row, styles.total]}>
              <Text variant="subhead" color="textSecondary">
                Total ({value} × {formatCLP(e.price_clp)})
              </Text>
              <Text variant="title3">{formatCLP(e.price_clp * value)}</Text>
            </View>
          ) : (
            <View style={[styles.row, styles.total]}>
              <Text variant="subhead" color="textSecondary">
                Total
              </Text>
              <Text variant="title3" color="textBrand">
                Gratis
              </Text>
            </View>
          )}

          <FormMessage tone="error" message={join.error ? toUserMessage(join.error) : null} />

          <Button
            label={value === 1 ? 'Confirmar 1 cupo' : `Confirmar ${value} cupos`}
            onPress={confirm}
            loading={join.isPending}
            disabled={left === 0}
            haptic
            testID="confirm-join"
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: screenMargin + spacing.xs,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  center: { alignItems: 'center' },
  gap: { gap: spacing.sm },
  flex: { flex: 1 },
  summary: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: shape.card,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  total: { paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  successButton: { alignSelf: 'stretch', marginTop: spacing.sm },
})
