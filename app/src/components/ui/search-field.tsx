import { useState, type Ref } from 'react'
import { StyleSheet, TextInput, View, type TextInputInstance } from 'react-native'

import { colors, shape, spacing, typography } from '@/theme/tokens'

import { Icon } from './icon'
import { IconButton } from './icon-button'

type Props = {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  ref?: Ref<TextInputInstance>
  testID?: string
}

/** Search input with a clear button (Explore). */
export function SearchField({ value, onChangeText, placeholder, ref, testID }: Props) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={[styles.row, focused && styles.focused]}>
      <Icon name="search" size={20} color={focused ? 'textBrand' : 'textSecondary'} />
      <TextInput
        ref={ref}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={100}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close"
          variant="plain"
          size={28}
          iconSize={16}
          iconColor="textSecondary"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onChangeText('')}
          style={styles.clear}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md + 2,
    paddingRight: spacing.sm,
    borderRadius: shape.input,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.surfaceMuted,
  },
  focused: { backgroundColor: colors.surface, borderColor: colors.borderFocus },
  input: { flex: 1, height: '100%', color: colors.textPrimary, ...typography.body, paddingVertical: 0 },
  clear: { backgroundColor: colors.border },
})
