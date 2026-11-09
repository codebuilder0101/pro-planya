import { zodResolver } from '@hookform/resolvers/zod'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { FormMessage } from '@/components/ui/form-message'
import { isIconName } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Screen } from '@/components/ui/screen'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { useCategories } from '@/features/categories/api'
import { useMyProfile, useUpdateProfile, useUploadAvatar, type Profile } from '@/features/profile/api'
import { toUserMessage } from '@/lib/errors'
import { PermissionDeniedError, permissionDeniedMessage, pickImage, type ImageSource } from '@/lib/images'
import { profileSchema, type ProfileOutput, type ProfileValues } from '@/lib/validation'
import { colors, spacing } from '@/theme/tokens'

export default function EditProfileScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>()
  const isOnboarding = onboarding === '1'
  const profile = useMyProfile()

  return (
    <>
      <Stack.Screen
        options={{
          title: isOnboarding ? 'Completa tu perfil' : 'Editar perfil',
          gestureEnabled: !isOnboarding,
        }}
      />
      {profile.isPending ? (
        <Screen edges={['bottom']}>
          <View style={styles.loading}>
            <Skeleton width={96} height={96} radius={48} />
            <Skeleton height={52} />
            <Skeleton height={52} />
            <Skeleton height={112} />
          </View>
        </Screen>
      ) : profile.isError ? (
        <Screen edges={['bottom']}>
          <EmptyState
            icon="cloud-offline-outline"
            title="No pudimos cargar tu perfil"
            actionLabel="Reintentar"
            onAction={() => profile.refetch()}
          />
        </Screen>
      ) : (
        <EditProfileForm profile={profile.data} isOnboarding={isOnboarding} />
      )}
    </>
  )
}

function leave() {
  if (router.canGoBack()) router.back()
  else router.replace('/')
}

function EditProfileForm({ profile, isOnboarding }: { profile: Profile; isOnboarding: boolean }) {
  const categories = useCategories()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const [formError, setFormError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<ProfileValues, unknown, ProfileOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name,
      bio: profile.bio,
      city: profile.city ?? '',
      interests: profile.interests,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await updateProfile.mutateAsync({
        full_name: values.fullName,
        bio: values.bio,
        city: values.city || null,
        interests: values.interests,
      })
      leave()
    } catch (error) {
      setFormError(toUserMessage(error))
    }
  })

  const changePhoto = async (source: ImageSource) => {
    setPhotoError(null)
    try {
      const picked = await pickImage(source, { allowsEditing: true, aspect: [1, 1] })
      if (!picked) return
      await uploadAvatar.mutateAsync(picked)
    } catch (error) {
      setPhotoError(
        error instanceof PermissionDeniedError
          ? permissionDeniedMessage(error.source)
          : toUserMessage(error, 'No pudimos subir la foto. Inténtalo de nuevo.'),
      )
    }
  }

  // TODO(stage-1 UI kit): replace with the shared bottom sheet once it exists.
  const onPhotoPress = () => {
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Tomar foto', onPress: () => void changePhoto('camera') },
      { text: 'Elegir de la galería', onPress: () => void changePhoto('library') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  return (
    <Screen
      scroll
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Button
            label={isOnboarding ? 'Guardar y continuar' : 'Guardar cambios'}
            onPress={onSubmit}
            loading={formState.isSubmitting}
            disabled={uploadAvatar.isPending}
            testID="profile-save"
          />
          {isOnboarding ? (
            <Button label="Omitir por ahora" variant="ghost" size="md" onPress={leave} />
          ) : null}
        </View>
      }
    >
      <View style={styles.photo}>
        <PressableScale
          onPress={onPhotoPress}
          disabled={uploadAvatar.isPending}
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto de perfil"
          testID="profile-photo"
        >
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={104} />
          {uploadAvatar.isPending ? (
            <View style={styles.photoBusy}>
              <ActivityIndicator color={colors.onPrimary} />
            </View>
          ) : null}
        </PressableScale>
        <Button
          label="Cambiar foto"
          variant="ghost"
          size="md"
          fullWidth={false}
          onPress={onPhotoPress}
          disabled={uploadAvatar.isPending}
        />
        <FormMessage tone="error" message={photoError} />
      </View>

      <View style={styles.form}>
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
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              testID="profile-name"
            />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field, fieldState }) => (
            <TextField
              label="Ciudad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Temuco, Pucón…"
              autoCapitalize="words"
              autoComplete="off"
              testID="profile-city"
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <TextField
              label="Sobre mí"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint={`${field.value.length}/500`}
              placeholder="Cuéntale a la comunidad qué te gusta hacer."
              multiline
              maxLength={500}
              testID="profile-bio"
            />
          )}
        />
        <Controller
          control={control}
          name="interests"
          render={({ field, fieldState }) => (
            <View style={styles.interests}>
              <Text variant="subhead" color="textSecondary">
                Intereses
              </Text>
              {categories.isPending ? (
                <Skeleton height={80} />
              ) : categories.isError ? (
                <Button
                  label="Reintentar"
                  variant="secondary"
                  size="md"
                  onPress={() => categories.refetch()}
                />
              ) : (
                <View style={styles.chips}>
                  {categories.data.map((c) => {
                    const selected = field.value.includes(c.id)
                    return (
                      <Chip
                        key={c.id}
                        label={c.name}
                        icon={isIconName(c.icon) ? c.icon : undefined}
                        iconColor={c.color}
                        selected={selected}
                        onPress={() =>
                          field.onChange(
                            selected ? field.value.filter((id) => id !== c.id) : [...field.value, c.id],
                          )
                        }
                      />
                    )
                  })}
                </View>
              )}
              {fieldState.error?.message ? (
                <Text variant="footnote" color="danger">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />
        <FormMessage tone="error" message={formError} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  loading: { gap: spacing.lg, alignItems: 'center', paddingTop: spacing.xl },
  photo: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  photoBusy: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 52,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: spacing.lg },
  interests: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { gap: spacing.xs },
})
