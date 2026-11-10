import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Platform, StyleSheet, View } from 'react-native'

import { TabScreen } from '@/components/navigation/tab-screen'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useCategoryMap } from '@/features/categories/api'
import { useMyExperiences, useSetPlanStatus, type MyExperience } from '@/features/host/api'
import { MyPlanCard } from '@/features/host/components/my-plan-card'
import { useMyProfile } from '@/features/profile/api'
import { useBecomeHostFlow } from '@/features/profile/become-host'
import { confirmAction } from '@/lib/dialogs'
import { toUserMessage } from '@/lib/errors'
import { colors, radius, shape, spacing } from '@/theme/tokens'

type Tab = 'upcoming' | 'past'

const newPlan = () => router.push('/plan/new')

export default function PublishScreen() {
  const profile = useMyProfile()
  const canHost = profile.data?.role === 'host' || profile.data?.role === 'admin'
  const becomeHost = useBecomeHostFlow()

  return (
    <TabScreen>
      <View style={styles.header}>
        <Text variant="title1" accessibilityRole="header">
          {canHost ? 'Mis planes' : 'Publicar'}
        </Text>
        {canHost ? (
          <Text variant="body" color="textSecondary">
            Publica tus planes y adminístralos desde aquí.
          </Text>
        ) : null}
      </View>
      {profile.isPending ? (
        <Skeleton height={160} />
      ) : canHost ? (
        <HostPlans />
      ) : (
        <EmptyState
          icon="megaphone-outline"
          title="¿Quieres publicar tus planes?"
          description="Tu cuenta es de explorador. Hazte anfitrión para publicar planes y recibir personas. Podrás seguir uniéndote a planes de otros."
          actionLabel={becomeHost.pending ? 'Un momento…' : 'Quiero ser anfitrión'}
          onAction={() => void becomeHost.start()}
        />
      )}
    </TabScreen>
  )
}

function showError(error: unknown) {
  const message = toUserMessage(error)
  if (Platform.OS === 'web') globalThis.alert?.(message)
  else Alert.alert('No pudimos actualizar el plan', message)
}

function HostPlans() {
  const plans = useMyExperiences()
  const categories = useCategoryMap()
  const setStatus = useSetPlanStatus()
  const [tab, setTab] = useState<Tab>('upcoming')
  // Read the clock once per mount (render must stay pure).
  const [now] = useState(() => Date.now())

  const all = plans.data ?? []
  const isPast = (e: MyExperience) => new Date(e.ends_at).getTime() <= now
  const upcoming = all.filter((e) => !isPast(e))
  const past = all.filter(isPast)
  const list = tab === 'upcoming' ? upcoming : past

  const toggleHidden = async (e: MyExperience) => {
    const hide = e.status !== 'hidden'
    if (hide) {
      const ok = await confirmAction({
        title: '¿Ocultar este plan?',
        message:
          'Dejará de aparecer en la app. Las personas inscritas mantienen su cupo y puedes mostrarlo otra vez cuando quieras.',
        confirmLabel: 'Ocultar',
      })
      if (!ok) return
    }
    setStatus.mutate({ id: e.id, status: hide ? 'hidden' : 'published' }, { onError: showError })
  }

  const cancel = async (e: MyExperience) => {
    const ok = await confirmAction({
      title: '¿Cancelar este plan?',
      message:
        e.seats_taken > 0
          ? `Hay ${e.seats_taken} ${e.seats_taken === 1 ? 'persona inscrita' : 'personas inscritas'}. Verán que el plan fue cancelado. Esto no se puede deshacer.`
          : 'Esto no se puede deshacer.',
      confirmLabel: 'Cancelar plan',
      cancelLabel: 'Volver',
      destructive: true,
    })
    if (ok) setStatus.mutate({ id: e.id, status: 'cancelled' }, { onError: showError })
  }

  return (
    <View style={styles.root}>
      <View style={styles.cta}>
        <View style={styles.ctaText}>
          <Text variant="headline" color="textOnImage">
            ¿Tienes un panorama en mente?
          </Text>
          <Text variant="footnote" color="textOnImage" style={styles.ctaSub}>
            Publícalo en minutos y encuentra gente para compartirlo.
          </Text>
        </View>
        <Button
          label="Publicar un plan"
          icon="add"
          variant="secondary"
          onPress={newPlan}
          testID="publish-new"
        />
      </View>

      {plans.isPending ? (
        <View style={styles.list}>
          <Skeleton height={168} radius={shape.card} />
          <Skeleton height={168} radius={shape.card} />
        </View>
      ) : plans.isError ? (
        <InlineError error={plans.error} onRetry={() => void plans.refetch()} inset={0} />
      ) : all.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="Aún no publicas planes"
          description="Tu primer plan puede ser una caminata, un taller o una junta para ver el atardecer."
        />
      ) : (
        <>
          <SegmentedControl
            accessibilityLabel="Mis planes"
            tone="brand"
            stretch
            value={tab}
            onChange={setTab}
            options={[
              { value: 'upcoming', label: `Próximos (${upcoming.length})` },
              { value: 'past', label: `Pasados (${past.length})` },
            ]}
          />
          {list.length === 0 ? (
            <EmptyState
              icon={tab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
              title={tab === 'upcoming' ? 'No tienes planes próximos' : 'Aún no tienes planes pasados'}
            />
          ) : (
            <View style={styles.list}>
              {list.map((e) => (
                <MyPlanCard
                  key={e.id}
                  item={e}
                  category={categories.get(e.category_id)}
                  now={now}
                  busy={setStatus.isPending && setStatus.variables?.id === e.id}
                  onOpen={() => router.push({ pathname: '/experience/[id]', params: { id: e.id } })}
                  onEdit={() => router.push({ pathname: '/plan/[id]/edit', params: { id: e.id } })}
                  onToggleHidden={() => void toggleHidden(e)}
                  onCancel={() => void cancel(e)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg, gap: spacing.xxs },
  root: { gap: spacing.lg },
  cta: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceBrandStrong,
  },
  ctaText: { gap: spacing.xxs },
  ctaSub: { opacity: 0.85 },
  list: { gap: spacing.md },
})
