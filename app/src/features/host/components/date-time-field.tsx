import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui/chip'
import { FormMessage } from '@/components/ui/form-message'
import { IconButton } from '@/components/ui/icon-button'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { dayLabel, formatDuration, formatTime, zonedTimeToDate, type DateString } from '@/lib/dates'
import { colors, radius, spacing } from '@/theme/tokens'

import {
  bookableDays,
  DURATION_STEP_MIN,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  START_TIMES,
} from '../plan-form'

type Props = {
  date: string
  startTime: string
  durationMin: number
  onDateChange: (date: DateString) => void
  onStartTimeChange: (time: string) => void
  onDurationChange: (minutes: number) => void
  dateError?: string
  timeError?: string
}

/** Day strip (next 120 days), start time chips (every 30 min) and a duration stepper. */
export function DateTimeField({
  date,
  startTime,
  durationMin,
  onDateChange,
  onStartTimeChange,
  onDurationChange,
  dateError,
  timeError,
}: Props) {
  const [days] = useState(() => bookableDays())
  // An edited plan may start at a time outside the 30-minute grid (e.g. 07:45).
  const times =
    startTime && !START_TIMES.includes(startTime) ? [...START_TIMES, startTime].sort() : START_TIMES
  const start = date && startTime ? zonedTimeToDate(date, startTime) : null
  const end = start ? new Date(start.getTime() + durationMin * 60_000) : null
  // Editing a plan whose day is no longer in the strip (ongoing plan): keep it visible.
  const dayList = date && !days.includes(date) ? [date, ...days] : days

  return (
    <View style={styles.root}>
      <Text variant="subhead" color="textSecondary">
        Fecha
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        style={styles.stripScroll}
      >
        {dayList.map((d, i) => {
          const label = dayLabel(d)
          const selected = d === date
          const name = i === 0 && d === days[0] ? 'Hoy' : label.weekday
          return (
            <PressableScale
              key={d}
              onPress={() => onDateChange(d)}
              accessibilityRole="button"
              accessibilityLabel={`${name} ${label.day} de ${label.month}`}
              accessibilityState={{ selected }}
              style={[
                styles.day,
                selected ? styles.daySelected : null,
                dateError && !date ? styles.dayError : null,
              ]}
            >
              <Text variant="caption" color={selected ? 'onPrimary' : 'textSecondary'}>
                {name}
              </Text>
              <Text variant="title3" color={selected ? 'onPrimary' : 'textPrimary'}>
                {label.day}
              </Text>
              <Text variant="caption" color={selected ? 'onPrimary' : 'textSecondary'}>
                {label.month}
              </Text>
            </PressableScale>
          )
        })}
      </ScrollView>
      <FormMessage tone="error" message={date ? null : (dateError ?? null)} />

      <Text variant="subhead" color="textSecondary" style={styles.label}>
        Hora de inicio
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        style={styles.stripScroll}
      >
        {times.map((t) => (
          <Chip key={t} label={t} selected={t === startTime} onPress={() => onStartTimeChange(t)} />
        ))}
      </ScrollView>
      <FormMessage tone="error" message={timeError ?? null} />

      <View style={styles.durationRow}>
        <View style={styles.flex}>
          <Text variant="subhead" color="textSecondary">
            Duración
          </Text>
          <Text variant="bodyStrong">
            {formatDuration(new Date(0), new Date(durationMin * 60_000))}
            {end ? (
              <Text variant="body" color="textSecondary">
                {`  ·  termina ${formatTime(end)}`}
              </Text>
            ) : null}
          </Text>
        </View>
        <View
          style={styles.stepper}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Duración"
          accessibilityValue={{ text: formatDuration(new Date(0), new Date(durationMin * 60_000)) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'increment')
              onDurationChange(Math.min(MAX_DURATION_MIN, durationMin + DURATION_STEP_MIN))
            if (e.nativeEvent.actionName === 'decrement')
              onDurationChange(Math.max(MIN_DURATION_MIN, durationMin - DURATION_STEP_MIN))
          }}
        >
          <IconButton
            icon="remove"
            variant="brand"
            size={40}
            accessibilityLabel="Menos tiempo"
            disabled={durationMin <= MIN_DURATION_MIN}
            onPress={() => onDurationChange(Math.max(MIN_DURATION_MIN, durationMin - DURATION_STEP_MIN))}
          />
          <IconButton
            icon="add"
            variant="brand"
            size={40}
            accessibilityLabel="Más tiempo"
            disabled={durationMin >= MAX_DURATION_MIN}
            onPress={() => onDurationChange(Math.min(MAX_DURATION_MIN, durationMin + DURATION_STEP_MIN))}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  flex: { flex: 1 },
  label: { marginTop: spacing.xs },
  stripScroll: { marginHorizontal: -spacing.lg },
  strip: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  day: {
    width: 60,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayError: { borderColor: colors.danger },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  stepper: { flexDirection: 'row', gap: spacing.sm },
})
