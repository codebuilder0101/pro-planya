import { router } from 'expo-router'
import { Alert } from 'react-native'

import { confirmAction } from '@/lib/dialogs'
import { toUserMessage } from '@/lib/errors'

import type { ReportTarget } from './api'

type Options = {
  report: { type: ReportTarget; id: string; label: string }
  /** The person to block (omitted when there is none, e.g. your own plan). */
  block?: { userId: string; name: string }
  onBlock: (userId: string) => Promise<void>
  /** Where to go after blocking (the current screen is no longer visible). */
  afterBlock?: () => void
}

/** "⋯" menu: report this item and/or block its author. */
export function openSafetyMenu({ report, block, onBlock, afterBlock }: Options) {
  const openReport = () => router.push({ pathname: '/report', params: { type: report.type, id: report.id } })

  const askBlock = async () => {
    if (!block) return
    const ok = await confirmAction({
      title: `¿Bloquear a ${block.name || 'este usuario'}?`,
      message:
        'No podrá escribirte y dejarás de ver sus planes. No le avisaremos. Puedes desbloquearlo desde tu perfil.',
      confirmLabel: 'Bloquear',
      destructive: true,
    })
    if (!ok) return
    try {
      await onBlock(block.userId)
      afterBlock?.()
    } catch (error) {
      Alert.alert('No pudimos bloquear', toUserMessage(error))
    }
  }

  Alert.alert('Opciones', undefined, [
    { text: report.label, onPress: openReport },
    ...(block
      ? [
          {
            text: `Bloquear a ${block.name || 'usuario'}`,
            style: 'destructive' as const,
            onPress: () => void askBlock(),
          },
        ]
      : []),
    { text: 'Cancelar', style: 'cancel' as const },
  ])
}
