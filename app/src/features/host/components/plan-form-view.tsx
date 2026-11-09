import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { FormMessage } from '@/components/ui/form-message'
import { isIconName } from '@/components/ui/icon'
import { Screen } from '@/components/ui/screen'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Stepper } from '@/components/ui/stepper'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { useCategories } from '@/features/categories/api'
import { toUserMessage } from '@/lib/errors'
import { colors, elevation, shape, spacing } from '@/theme/tokens'

import { useSavePlan } from '../api'
import {
  formatPriceInput,
  makePlanSchema,
  MAX_CAPACITY,
  type FormPhoto,
  type PlanFormOutput,
  type PlanFormValues,
} from '../plan-form'

import { DateTimeField } from './date-time-field'
import { LocationField } from './location-field'
import { PhotoGrid } from './photo-grid'

const CAPACITY_PICKS = [5, 10, 15, 20, 30, 50]

type Props = {
  initialValues: PlanFormValues
  /** Editing an existing plan. */
  experienceId?: string
  originalStartsAt?: string
  /** Capacity cannot go below the seats already booked. */
  seatsTaken?: number
  onSaved: (id: string) => void
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        {hint ? (
          <Text variant="footnote" color="textSecondary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export function PlanFormView({
  initialValues,
  experienceId,
  originalStartsAt,
  seatsTaken = 0,
  onSaved,
}: Props) {
  const isEdit = experienceId != null
  const categories = useCategories()
  const save = useSavePlan()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [originalPhotos] = useState<FormPhoto[]>(() => initialValues.photos)
  const minCapacity = Math.max(1, seatsTaken)

  const { control, handleSubmit, formState, setValue } = useForm<PlanFormValues, unknown, PlanFormOutput>({
    resolver: zodResolver(makePlanSchema({ originalStartsAt: originalStartsAt ?? null })),
    defaultValues: initialValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const isFree = useWatch({ control, name: 'isFree' })
  // Shown while invalid fields remain after a submit attempt; disappears as they are fixed.
  const hasFieldErrors = formState.submitCount > 0 && Object.keys(formState.errors).length > 0
  const formError = saveError ?? (hasFieldErrors ? 'Revisa los campos marcados en rojo.' : null)

  const onSubmit = handleSubmit(
    async (values) => {
      setSaveError(null)
      try {
        const id = await save.mutateAsync({ values, experienceId, originalPhotos })
        onSaved(id)
      } catch (error) {
        setSaveError(
          toUserMessage(error, 'No pudimos guardar el plan. Revisa tu conexión e inténtalo de nuevo.'),
        )
      }
    },
    () => setSaveError(null),
  )

  return (
    <Screen
      scroll
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <FormMessage tone="error" message={formError} />
          <Button
            label={isEdit ? 'Guardar cambios' : 'Publicar plan'}
            icon={isEdit ? 'checkmark' : 'paper-plane-outline'}
            onPress={onSubmit}
            loading={formState.isSubmitting}
            haptic
            testID="plan-submit"
          />
        </View>
      }
      contentStyle={styles.content}
    >
      <Section title="Fotos" hint="Hasta 8 fotos. Las fotos reales inspiran a más personas a sumarse.">
        <Controller
          control={control}
          name="photos"
          render={({ field, fieldState }) => (
            <PhotoGrid photos={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
      </Section>

      <Section title="Lo básico">
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField
              label="Título"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Ej: Caminata al Cerro Ñielol al amanecer"
              maxLength={100}
              testID="plan-title"
            />
          )}
        />
        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <View style={styles.group}>
              <Text variant="subhead" color="textSecondary">
                Categoría
              </Text>
              {categories.isPending ? (
                <Skeleton height={80} />
              ) : (
                <View style={styles.wrap}>
                  {(categories.data ?? []).map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      icon={isIconName(c.icon) ? c.icon : undefined}
                      iconColor={colors.textBrand}
                      selected={field.value === c.id}
                      onPress={() => field.onChange(c.id)}
                    />
                  ))}
                </View>
              )}
              <FormMessage tone="error" message={fieldState.error?.message ?? null} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField
              label="Descripción"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint={`${field.value.length}/4000`}
              placeholder="¿Qué van a hacer? ¿Qué hay que llevar? ¿Para quién es?"
              multiline
              maxLength={4000}
              testID="plan-description"
            />
          )}
        />
      </Section>

      <Section title="¿Dónde?">
        <Controller
          control={control}
          name="location"
          render={({ field: location, fieldState: locationState }) => (
            <Controller
              control={control}
              name="comuna"
              render={({ field: comuna, fieldState: comunaState }) => (
                <LocationField
                  comuna={comuna.value}
                  onComunaChange={comuna.onChange}
                  location={location.value ?? null}
                  onLocationChange={location.onChange}
                  comunaError={comunaState.error?.message}
                  locationError={locationState.error?.message}
                />
              )}
            />
          )}
        />
      </Section>

      <Section title="¿Cuándo?">
        <Controller
          control={control}
          name="date"
          render={({ field: date, fieldState: dateState }) => (
            <Controller
              control={control}
              name="startTime"
              render={({ field: time, fieldState: timeState }) => (
                <Controller
                  control={control}
                  name="durationMin"
                  render={({ field: duration }) => (
                    <DateTimeField
                      date={date.value}
                      startTime={time.value}
                      durationMin={duration.value}
                      onDateChange={date.onChange}
                      onStartTimeChange={time.onChange}
                      onDurationChange={duration.onChange}
                      dateError={dateState.error?.message}
                      timeError={timeState.error?.message}
                    />
                  )}
                />
              )}
            />
          )}
        />
      </Section>

      <Section title="Cupos y precio">
        <Controller
          control={control}
          name="capacity"
          render={({ field, fieldState }) => (
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="subhead" color="textSecondary">
                    Cupos
                  </Text>
                  {seatsTaken > 0 ? (
                    <Text variant="caption" color="textSecondary">
                      {seatsTaken === 1 ? 'Ya hay 1 inscrito' : `Ya hay ${seatsTaken} inscritos`}
                    </Text>
                  ) : null}
                </View>
                <Stepper
                  value={field.value}
                  min={minCapacity}
                  max={MAX_CAPACITY}
                  onChange={field.onChange}
                  label="Cupos"
                />
              </View>
              <View style={styles.wrap}>
                {CAPACITY_PICKS.filter((n) => n >= minCapacity).map((n) => (
                  <Chip
                    key={n}
                    label={String(n)}
                    selected={field.value === n}
                    onPress={() => field.onChange(n)}
                  />
                ))}
              </View>
              <FormMessage tone="error" message={fieldState.error?.message ?? null} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="isFree"
          render={({ field }) => (
            <SegmentedControl
              accessibilityLabel="Precio"
              tone="brand"
              stretch
              value={field.value ? 'free' : 'paid'}
              onChange={(v) => {
                field.onChange(v === 'free')
                if (v === 'free') setValue('price', '')
              }}
              options={[
                { value: 'free', label: 'Gratis', icon: 'gift-outline' },
                { value: 'paid', label: 'De pago', icon: 'cash-outline' },
              ]}
            />
          )}
        />
        {!isFree ? (
          <Controller
            control={control}
            name="price"
            render={({ field, fieldState }) => (
              <TextField
                label="Precio por persona (CLP)"
                value={field.value ? `$${field.value}` : ''}
                onChangeText={(t) => field.onChange(formatPriceInput(t))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                placeholder="$15.000"
                keyboardType="number-pad"
                inputMode="numeric"
                testID="plan-price"
              />
            )}
          />
        ) : null}
      </Section>

      <Section
        title="Fuente (opcional)"
        hint="Si el evento lo organiza otra entidad (municipalidad, centro cultural…), indícalo aquí."
      >
        <Controller
          control={control}
          name="sourceName"
          render={({ field, fieldState }) => (
            <TextField
              label="Organiza"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Ej: Municipalidad de Temuco"
              maxLength={80}
            />
          )}
        />
        <Controller
          control={control}
          name="sourceUrl"
          render={({ field, fieldState }) => (
            <TextField
              label="Enlace"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="https://"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              maxLength={500}
            />
          )}
        />
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    marginHorizontal: -spacing.xs,
    borderRadius: shape.card,
    backgroundColor: colors.surface,
    ...elevation[1],
  },
  sectionHeader: { gap: spacing.xxs },
  group: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  footer: { gap: spacing.sm },
})
