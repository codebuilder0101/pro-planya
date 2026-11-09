import { zodResolver } from '@hookform/resolvers/zod'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View, type TextInputInstance } from 'react-native'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/features/auth/auth-provider'
import { toUserMessage } from '@/lib/errors'
import {
  emailSchema,
  resetPasswordSchema,
  type ResetPasswordOutput,
  type ResetPasswordValues,
} from '@/lib/validation'
import { spacing } from '@/theme/tokens'

const RESEND_COOLDOWN_S = 60

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>()
  const parsedEmail = emailSchema.safeParse(params.email ?? '')
  const email = parsedEmail.success ? parsedEmail.data : null

  const { completePasswordReset, requestPasswordReset, abandonPasswordReset } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S)
  const [resending, setResending] = useState(false)
  const passwordRef = useRef<TextInputInstance>(null)
  const confirmRef = useRef<TextInputInstance>(null)

  const { control, handleSubmit, formState } = useForm<ResetPasswordValues, unknown, ResetPasswordOutput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  })

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // If the user leaves halfway (code verified, password not changed), drop that session.
  useEffect(() => {
    return () => {
      abandonPasswordReset().catch(() => undefined)
    }
  }, [abandonPasswordReset])

  if (!email) {
    // Reached without a valid email (should not happen through the UI).
    return (
      <Screen edges={['bottom']}>
        <View style={styles.header}>
          <Text variant="title1">Enlace no válido</Text>
          <Button label="Volver" onPress={() => router.replace('/forgot-password')} />
        </View>
      </Screen>
    )
  }

  const onSubmit = handleSubmit(async ({ code, password }) => {
    setFormError(null)
    setInfo(null)
    try {
      await completePasswordReset(email, code, password)
      // Signed in with the new password: the route guard opens the app.
    } catch (error) {
      setFormError(toUserMessage(error))
    }
  })

  const onResend = async () => {
    setFormError(null)
    setResending(true)
    try {
      await requestPasswordReset(email)
      setInfo('Te enviamos un código nuevo.')
      setCooldown(RESEND_COOLDOWN_S)
    } catch (error) {
      setFormError(toUserMessage(error))
    } finally {
      setResending(false)
    }
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="title1">Crea una contraseña nueva</Text>
        <Text variant="body" color="textSecondary">
          Si existe una cuenta con {email}, te enviamos un código de 6 dígitos. Revisa también la carpeta de
          spam.
        </Text>
      </View>
      <View style={styles.form}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <TextField
              label="Código"
              value={field.value}
              onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 6))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="reset-code"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              ref={passwordRef}
              label="Contraseña nueva"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint="Mínimo 8 caracteres, con letras y números."
              password
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
              testID="reset-password"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <TextField
              ref={confirmRef}
              label="Repite la contraseña"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              password
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              testID="reset-confirm"
            />
          )}
        />
        <FormMessage tone="error" message={formError} />
        <FormMessage tone="success" message={info} />
        <Button
          label="Guardar contraseña"
          onPress={onSubmit}
          loading={formState.isSubmitting}
          testID="reset-submit"
        />
        <Button
          label={cooldown > 0 ? `Reenviar código en ${cooldown} s` : 'Reenviar código'}
          variant="ghost"
          size="md"
          onPress={onResend}
          disabled={cooldown > 0}
          loading={resending}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
})
