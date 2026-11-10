import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View, type TextInputInstance } from 'react-native'

import { Button } from '@/components/ui/button'
import { ChoiceCard } from '@/components/ui/choice-card'
import { FormMessage } from '@/components/ui/form-message'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/features/auth/auth-provider'
import { toUserMessage } from '@/lib/errors'
import {
  accountRole,
  signUpSchema,
  type AccountRole,
  type SignUpOutput,
  type SignUpValues,
} from '@/lib/validation'
import { spacing } from '@/theme/tokens'

export default function SignUpScreen() {
  const { signUp } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const emailRef = useRef<TextInputInstance>(null)
  const passwordRef = useRef<TextInputInstance>(null)

  const { control, handleSubmit, formState } = useForm<SignUpValues, unknown, SignUpOutput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', roles: [] },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { needsEmailConfirmation } = await signUp({ ...values, role: accountRole(values.roles) })
      if (needsEmailConfirmation) {
        router.replace({ pathname: '/check-email', params: { email: values.email } })
      }
      // Otherwise a session exists and the route guard opens the app.
    } catch (error) {
      setFormError(toUserMessage(error))
    }
  })

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="title1">Crea tu cuenta</Text>
        <Text variant="body" color="textSecondary">
          Únete para descubrir planes en Temuco, Pucón y toda La Araucanía.
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="roles"
          render={({ field, fieldState }) => (
            <View style={styles.roles} accessibilityLabel="¿Cómo quieres usar PlanYá?">
              <View style={styles.rolesHeader}>
                <Text variant="headline">¿Cómo quieres usar PlanYá?</Text>
                <Text variant="footnote" color="textSecondary">
                  Puedes elegir una o las dos. Como anfitrión también puedes unirte a planes de otros.
                </Text>
              </View>
              <ChoiceCard
                multiple
                title="Explorador"
                description="Quiero encontrar planes y unirme a ellos."
                icon="compass-outline"
                selected={field.value.includes('explorer')}
                onPress={() => field.onChange(toggle(field.value, 'explorer'))}
                testID="sign-up-role-explorer"
              />
              <ChoiceCard
                multiple
                title="Anfitrión"
                description="Quiero publicar mis propios planes y recibir personas."
                icon="megaphone-outline"
                selected={field.value.includes('host')}
                onPress={() => field.onChange(toggle(field.value, 'host'))}
                testID="sign-up-role-host"
              />
              {fieldState.error?.message ? (
                <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="fullName"
          render={({ field, fieldState }) => (
            <TextField
              label="Nombre"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Tu nombre y apellido"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailRef.current?.focus()}
              testID="sign-up-name"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              ref={emailRef}
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
              testID="sign-up-email"
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
              hint="Mínimo 8 caracteres, con letras y números."
              password
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              testID="sign-up-password"
            />
          )}
        />
        <FormMessage tone="error" message={formError} />
        <Button
          label="Crear cuenta"
          onPress={onSubmit}
          loading={formState.isSubmitting}
          testID="sign-up-submit"
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  roles: { gap: spacing.md },
  rolesHeader: { gap: spacing.xxs },
})

function toggle(roles: AccountRole[], role: AccountRole): AccountRole[] {
  return roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]
}
