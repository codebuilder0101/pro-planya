import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View, type TextInputInstance } from 'react-native'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { TextLink } from '@/components/ui/text-link'
import { useAuth } from '@/features/auth/auth-provider'
import { toUserMessage } from '@/lib/errors'
import { signInSchema, type SignInOutput, type SignInValues } from '@/lib/validation'
import { spacing } from '@/theme/tokens'

export default function SignInScreen() {
  const { signIn, notice } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const passwordRef = useRef<TextInputInstance>(null)

  const { control, handleSubmit, formState } = useForm<SignInValues, unknown, SignInOutput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null)
    try {
      await signIn(email, password)
      // The route guard switches to the app automatically.
    } catch (error) {
      setFormError(toUserMessage(error))
    }
  })

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text variant="display" color="textBrand">
          PlanYá
        </Text>
        <Text variant="title2">Hola de nuevo</Text>
        <Text variant="body" color="textSecondary">
          Descubre planes en La Araucanía y encuentra con quién hacerlos.
        </Text>
      </View>

      <View style={styles.form}>
        <FormMessage tone="error" message={notice} />
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
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="sign-in-email"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              ref={passwordRef}
              label="Contraseña"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              password
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              testID="sign-in-password"
            />
          )}
        />
        <View style={styles.forgot}>
          <TextLink href="/forgot-password" label="¿Olvidaste tu contraseña?" />
        </View>
        <FormMessage tone="error" message={formError} />
        <Button
          label="Iniciar sesión"
          onPress={onSubmit}
          loading={formState.isSubmitting}
          testID="sign-in-submit"
        />
      </View>

      <View style={styles.footer}>
        <Text variant="callout" color="textSecondary">
          ¿No tienes cuenta?
        </Text>
        <TextLink href="/sign-up" label="Crear cuenta" variant="bodyStrong" />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginTop: spacing.xxxl, marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
  forgot: { alignItems: 'flex-start', marginTop: -spacing.sm },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
})
