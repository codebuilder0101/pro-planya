import { useState } from 'react'
import { Alert, Platform, type AlertButton } from 'react-native'

import { toUserMessage } from '@/lib/errors'
import { PermissionDeniedError, permissionDeniedMessage, pickImage, type ImageSource } from '@/lib/images'

import { useRemoveCover, useUploadProfileImage, type ProfileImageKind } from './api'

const SETTINGS = {
  avatar: { title: 'Foto de perfil', aspect: [1, 1] as [number, number] },
  // Wide banner; Android lets the user crop to this shape (iOS crops square, shown with cover fit).
  cover: { title: 'Foto de portada', aspect: [2, 1] as [number, number] },
}

function useChangeProfileImage(kind: ProfileImageKind, extra: AlertButton[] = []) {
  const upload = useUploadProfileImage(kind)
  const [error, setError] = useState<string | null>(null)

  const change = async (source: ImageSource) => {
    setError(null)
    try {
      const picked = await pickImage(source, { allowsEditing: true, aspect: SETTINGS[kind].aspect })
      if (!picked) return
      await upload.mutateAsync(picked)
    } catch (e) {
      setError(
        e instanceof PermissionDeniedError
          ? permissionDeniedMessage(e.source)
          : toUserMessage(e, 'No pudimos subir la foto. Inténtalo de nuevo.'),
      )
    }
  }

  const open = () => {
    const buttons: AlertButton[] = [
      { text: 'Tomar foto', onPress: () => void change('camera') },
      { text: 'Elegir de la galería', onPress: () => void change('library') },
      ...extra,
    ]
    // Android alerts show at most 3 buttons; there, tapping outside cancels instead.
    if (Platform.OS !== 'android' || buttons.length < 3) buttons.push({ text: 'Cancelar', style: 'cancel' })
    Alert.alert(SETTINGS[kind].title, undefined, buttons, { cancelable: true })
  }

  return { open, uploading: upload.isPending, error }
}

/** "Tomar foto / Elegir de la galería" menu that uploads the new profile photo. */
export function useChangeAvatar() {
  const { open, uploading, error } = useChangeProfileImage('avatar')
  return { open, uploading, error }
}

/** Same menu for the cover banner, plus "Quitar portada" when there is one. */
export function useChangeCover(hasCover: boolean) {
  const remove = useRemoveCover()
  const [removeError, setRemoveError] = useState<string | null>(null)
  const removeButton: AlertButton = {
    text: 'Quitar portada',
    style: 'destructive',
    onPress: () => {
      setRemoveError(null)
      remove.mutate(undefined, {
        onError: (e) => setRemoveError(toUserMessage(e, 'No pudimos quitar la portada.')),
      })
    },
  }
  const image = useChangeProfileImage('cover', hasCover ? [removeButton] : [])
  return {
    open: image.open,
    uploading: image.uploading || remove.isPending,
    error: image.error ?? removeError,
  }
}
