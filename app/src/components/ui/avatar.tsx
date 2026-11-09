import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

import { initials } from '@/lib/format'
import { colors, typography } from '@/theme/tokens'

import { Text } from './text'

type Props = {
  uri: string | null | undefined
  name: string | null | undefined
  size?: number
}

export function Avatar({ uri, name, size = 48 }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 }
  return (
    <View
      style={[styles.base, box]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Foto de ${name}` : 'Foto de perfil'}
    >
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" cachePolicy="memory-disk" transition={150} />
      ) : (
        <Text
          color="textBrand"
          style={[
            typography.headline,
            { fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.46) },
          ]}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
