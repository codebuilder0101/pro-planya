import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { IconButton } from '@/components/ui/icon-button'
import { Text } from '@/components/ui/text'
import { colors, radius } from '@/theme/tokens'

import { useUnreadCount } from './api'

/** Header shortcut to the conversation list, with the unread count. */
export function MessagesButton() {
  const unread = useUnreadCount()
  return (
    <View>
      <IconButton
        icon="chatbubbles-outline"
        variant="surface"
        size={44}
        iconSize={22}
        accessibilityLabel={unread > 0 ? `Mensajes, ${unread} sin leer` : 'Mensajes'}
        onPress={() => router.push('/chats')}
        testID="open-messages"
      />
      {unread > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text variant="captionStrong" color="textInverse">
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
