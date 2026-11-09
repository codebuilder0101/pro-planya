import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Platform, StyleSheet, View } from 'react-native'

import { TabScreen } from '@/components/navigation/tab-screen'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { splitBookings, useCancelMyBooking, useMyBookings, type MyBooking } from '@/features/bookings/api'
import { BookingCard } from '@/features/bookings/booking-card'
import { useCategoryMap } from '@/features/categories/api'
import { useStartConversation } from '@/features/chat/api'
import { confirmAction } from '@/lib/dialogs'
import { toUserMessage } from '@/lib/errors'
import { shape, spacing } from '@/theme/tokens'

type Tab = 'upcoming' | 'past'

function showError(title: string, error: unknown) {
  const message = toUserMessage(error)
  if (Platform.OS === 'web') globalThis.alert?.(message)
  else Alert.alert(title, message)
}

export default function BookingsScreen() {
  const bookings = useMyBookings()
  const categories = useCategoryMap()
  const cancel = useCancelMyBooking()
  const start = useStartConversation()
  const [tab, setTab] = useState<Tab>('upcoming')
  // Read the clock once per mount (render must stay pure).
  const [now] = useState(() => Date.now())

  const { upcoming, past } = splitBookings(bookings.data ?? [], now)
  const list = tab === 'upcoming' ? upcoming : past

  const onCancel = async (b: MyBooking) => {
    const ok = await confirmAction({
      title: '¿Cancelar tu reserva?',
      message: 'Liberaremos tus cupos para que otra persona pueda unirse.',
      confirmLabel: 'Cancelar reserva',
      destructive: true,
    })
    if (ok) cancel.mutate(b.id, { onError: (e) => showError('No pudimos cancelar la reserva', e) })
  }

  const onMessage = async (b: MyBooking) => {
    try {
      const id = await start.mutateAsync(b.experience.id)
      router.push({ pathname: '/chats/[id]', params: { id } })
    } catch (error) {
      showError('No pudimos abrir el chat', error)
    }
  }

  return (
    <TabScreen>
      <View style={styles.header}>
        <Text variant="title1" accessibilityRole="header">
          Reservas
        </Text>
        <Text variant="body" color="textSecondary">
          Los planes a los que te uniste.
        </Text>
      </View>

      {bookings.isPending ? (
        <View style={styles.list}>
          <Skeleton height={168} radius={shape.card} />
          <Skeleton height={168} radius={shape.card} />
        </View>
      ) : bookings.isError ? (
        <InlineError error={bookings.error} onRetry={() => void bookings.refetch()} inset={0} />
      ) : upcoming.length + past.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Aún no tienes reservas"
          description="Cuando te unas a un plan, lo verás aquí."
          actionLabel="Explorar planes"
          onAction={() => router.navigate('/explore')}
        />
      ) : (
        <View style={styles.root}>
          <SegmentedControl
            accessibilityLabel="Reservas"
            tone="brand"
            stretch
            value={tab}
            onChange={setTab}
            options={[
              { value: 'upcoming', label: `Próximas (${upcoming.length})` },
              { value: 'past', label: `Pasadas (${past.length})` },
            ]}
          />
          {list.length === 0 ? (
            <EmptyState
              icon={tab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
              title={tab === 'upcoming' ? 'No tienes planes próximos' : 'Aún no tienes planes pasados'}
              description={tab === 'upcoming' ? 'Busca algo nuevo para hacer esta semana.' : undefined}
              actionLabel={tab === 'upcoming' ? 'Explorar planes' : undefined}
              onAction={tab === 'upcoming' ? () => router.navigate('/explore') : undefined}
            />
          ) : (
            <View style={styles.list}>
              {list.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  category={categories.get(b.experience.category_id)}
                  now={now}
                  busy={
                    (cancel.isPending && cancel.variables === b.id) ||
                    (start.isPending && start.variables === b.experience.id)
                  }
                  onOpen={() =>
                    router.push({ pathname: '/experience/[id]', params: { id: b.experience.id } })
                  }
                  onMessage={() => void onMessage(b)}
                  onCancel={() => void onCancel(b)}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg, gap: spacing.xxs },
  root: { gap: spacing.lg },
  list: { gap: spacing.md },
})
