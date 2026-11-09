import { Alert, Platform } from 'react-native'

import type { ImageSource } from './images'

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
}

/** Native confirmation dialog; resolves true when the user confirms. */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Volver',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  // Alert.alert does nothing on web (design previews only).
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.([title, message].filter(Boolean).join('\n\n')) ?? false)
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    )
  })
}

/** "Tomar foto" / "Elegir de la galería"; null when cancelled. Web has no camera: gallery directly. */
export function chooseImageSource(title: string): Promise<ImageSource | null> {
  if (Platform.OS === 'web') return Promise.resolve('library')
  return new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        { text: 'Tomar foto', onPress: () => resolve('camera') },
        { text: 'Elegir de la galería', onPress: () => resolve('library') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    )
  })
}
