import { StyleSheet, View } from 'react-native'

import { TabScreen } from '@/components/navigation/tab-screen'
import { EmptyState } from '@/components/ui/empty-state'
import { Text } from '@/components/ui/text'
import { spacing } from '@/theme/tokens'

/** My bookings (upcoming / past) is built with the join flow. */
export default function BookingsScreen() {
  return (
    <TabScreen>
      <View style={styles.header}>
        <Text variant="title1" accessibilityRole="header">
          Reservas
        </Text>
      </View>
      <EmptyState
        icon="calendar-outline"
        title="Aún no tienes reservas"
        description="Cuando te unas a un plan, lo verás aquí."
      />
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xl },
})
