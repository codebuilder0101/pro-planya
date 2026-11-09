import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/features/auth/auth-provider'
import { toUserMessage } from '@/lib/errors'
import { forgotPasswordSchema, type ForgotPasswordOutput, type ForgotPasswordValues } from '@/lib/validation'
import { spacing } from '@/theme/tokens'

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<ForgotPasswordValues, unknown, ForgotPasswordOutput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await requestPasswordReset(email)
      router.push({ pathname: '/reset-password', params: { email } })
    } catch (error) {
      setFormError(toUserMessage(error))
    }
  })

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="title1">Recupera tu contraseña</Text>
        <Text variant="body" color="textSecondary">
          Te enviaremos un código de 6 dígitos a tu correo para crear una contraseña nueva.
        </Text>
      </View>
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="Correo"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="tu@correo.cl"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void onSubmit()}
              testID="forgot-email"
            />
          )}
        />
        <FormMessage tone="error" message={formError} />
        <Button
          label="Enviar código"
          onPress={onSubmit}
          loading={formState.isSubmitting}
          testID="forgot-submit"
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
})
