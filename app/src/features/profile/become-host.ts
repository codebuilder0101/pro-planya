import { router } from 'expo-router'
import { Alert } from 'react-native'

import { confirmAction } from '@/lib/dialogs'
import { toUserMessage } from '@/lib/errors'

import { useBecomeHost } from './api'

/** Confirm, switch the account to host and open "Mis planes". */
export function useBecomeHostFlow() {
  const becomeHost = useBecomeHost()

  const start = async () => {
    const ok = await confirmAction({
      title: '¿Quieres ser anfitrión?',
      message:
        'Podrás publicar tus propios planes y recibir personas. Sigues pudiendo unirte a planes de otros como siempre.',
      confirmLabel: 'Sí, quiero',
    })
    if (!ok) return
    try {
      await becomeHost.mutateAsync()
      router.navigate('/publish')
      Alert.alert('¡Listo, ya eres anfitrión!', 'Ahora puedes publicar tu primer plan.')
    } catch (error) {
      Alert.alert('No pudimos cambiar tu cuenta', toUserMessage(error))
    }
  }

  return { start, pending: becomeHost.isPending }
}
