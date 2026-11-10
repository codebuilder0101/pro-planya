import { useState } from 'react'
import { Alert } from 'react-native'

import { toUserMessage } from '@/lib/errors'
import { PermissionDeniedError, permissionDeniedMessage, pickImage, type ImageSource } from '@/lib/images'

import { useUploadAvatar } from './api'

/** "Tomar foto / Elegir de la galería" menu that uploads the new profile photo. */
export function useChangeAvatar() {
  const upload = useUploadAvatar()
  const [error, setError] = useState<string | null>(null)

  const change = async (source: ImageSource) => {
    setError(null)
    try {
      const picked = await pickImage(source, { allowsEditing: true, aspect: [1, 1] })
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
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Tomar foto', onPress: () => void change('camera') },
      { text: 'Elegir de la galería', onPress: () => void change('library') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  return { open, uploading: upload.isPending, error }
}
