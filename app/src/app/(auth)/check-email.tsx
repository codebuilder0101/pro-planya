import { router, useLocalSearchParams } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Screen } from '@/components/ui/screen'

/** Shown after sign-up when the project requires email confirmation. */
export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()
  return (
    <Screen footer={<Button label="Ir a iniciar sesión" onPress={() => router.replace('/sign-in')} />}>
      <View style={styles.center}>
        <EmptyState
          icon="mail-unread-outline"
          title="Revisa tu correo"
          description={`Te enviamos un enlace para confirmar tu cuenta${email ? ` a ${email}` : ''}. Después de confirmarla, vuelve e inicia sesión.`}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
})
