import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { Icon } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import {
  MAX_REPORT_COMMENT,
  REPORT_REASONS,
  useReport,
  type ReportReason,
  type ReportTarget,
} from '@/features/safety/api'
import { toUserMessage } from '@/lib/errors'
import { colors, radius, screenMargin, spacing } from '@/theme/tokens'

const TITLES: Record<ReportTarget, string> = {
  experience: 'Reportar plan',
  profile: 'Reportar usuario',
  conversation: 'Reportar conversación',
}

function isTarget(value: string | undefined): value is ReportTarget {
  return value === 'experience' || value === 'profile' || value === 'conversation'
}

/** Bottom sheet: report a plan, a user or a conversation to the moderators. */
export default function ReportSheet() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ type: string; id: string }>()
  const report = useReport()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const type = isTarget(params.type) ? params.type : null
  const targetId = params.id ?? ''

  const submit = async () => {
    if (!type || !targetId) return
    if (!reason) {
      setError('Elige un motivo.')
      return
    }
    if (reason === 'other' && comment.trim().length === 0) {
      setError('Cuéntanos brevemente qué pasó.')
      return
    }
    setError(null)
    try {
      await report.mutateAsync({ targetType: type, targetId, reason, comment })
      setSent(true)
    } catch (e) {
      setError(toUserMessage(e, 'No pudimos enviar el reporte. Inténtalo de nuevo.'))
    }
  }

  if (sent) {
    return (
      <View style={[styles.done, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.doneIcon}>
          <Icon name="shield-checkmark" size={36} color="onPrimary" />
        </View>
        <Text variant="title2" align="center">
          Gracias por avisarnos
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          Nuestro equipo revisará el reporte. Si alguien te incomoda, también puedes bloquearlo.
        </Text>
        <Button label="Listo" onPress={() => router.back()} testID="report-done" />
      </View>
    )
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing.xl}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.header}>
        <Text variant="title2" accessibilityRole="header">
          {type ? TITLES[type] : 'Reportar'}
        </Text>
        <Text variant="footnote" color="textSecondary">
          El reporte es anónimo: la otra persona no sabrá que fuiste tú.
        </Text>
      </View>

      <View style={styles.reasons} accessibilityRole="radiogroup" accessibilityLabel="Motivo">
        {REPORT_REASONS.map((r) => {
          const selected = reason === r.value
          return (
            <PressableScale
              key={r.value}
              onPress={() => {
                setReason(r.value)
                setError(null)
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${r.label}. ${r.hint}`}
              style={[styles.reason, selected ? styles.reasonSelected : null]}
              testID={`report-reason-${r.value}`}
            >
              <View style={styles.flex}>
                <Text variant="bodyStrong">{r.label}</Text>
                <Text variant="caption" color="textSecondary">
                  {r.hint}
                </Text>
              </View>
              <Icon
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? 'textBrand' : 'textTertiary'}
              />
            </PressableScale>
          )
        })}
      </View>

      <TextField
        label={reason === 'other' ? 'Comentario' : 'Comentario (opcional)'}
        value={comment}
        onChangeText={setComment}
        placeholder="¿Qué pasó?"
        multiline
        maxLength={MAX_REPORT_COMMENT}
        hint={`${comment.length}/${MAX_REPORT_COMMENT}`}
        testID="report-comment"
      />

      <FormMessage tone="error" message={error} />
      <Button
        label="Enviar reporte"
        icon="flag-outline"
        onPress={() => void submit()}
        loading={report.isPending}
        disabled={!type || !targetId}
        testID="report-submit"
      />
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: screenMargin, paddingTop: spacing.xl },
  header: { gap: spacing.xs },
  reasons: { gap: spacing.sm },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  flex: { flex: 1, gap: 2 },
  done: { gap: spacing.md, paddingHorizontal: screenMargin, paddingTop: spacing.xl, alignItems: 'stretch' },
  doneIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
