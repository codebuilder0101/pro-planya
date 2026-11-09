import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

import { font, spacing } from '@/theme/tokens'

import { Text } from './text'

const MARK = require('../../../assets/images/logo-mark.png') as number

/** PlanYá mark + wordmark (Home header). */
export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="PlanYá">
      <Image source={MARK} style={{ width: size, height: size }} contentFit="contain" />
      <Text variant="title3" color="textBrand" style={styles.word}>
        PlanYá
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  word: { ...font('bold'), letterSpacing: -0.3 },
})
