import { useState, type Ref } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native'

import { colors, minTapTarget, radius, spacing, typography } from '@/theme/tokens'

import { Icon } from './icon'
import { Text } from './text'

/** The field draws its own focus border; hide the browser outline (web previews). */
const WEB_NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string
  error?: string
  hint?: string
  /** Shows a show/hide toggle and hides the text. */
  password?: boolean
  ref?: Ref<TextInputInstance>
}

export function TextField({
  label,
  error,
  hint,
  password = false,
  multiline,
  ref,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const borderColor = error ? colors.danger : focused ? colors.borderFocus : colors.border

  return (
    <View style={styles.container}>
      <Text
        variant="subhead"
        color="textSecondary"
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </Text>
      <View style={[styles.inputRow, { borderColor }, multiline && styles.multilineRow]}>
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={[styles.input, multiline && styles.multilineInput, WEB_NO_OUTLINE]}
        />
        {password ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={8}
            style={styles.toggle}
          >
            <Icon name={revealed ? 'eye-off-outline' : 'eye-outline'} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingLeft: spacing.lg,
  },
  multilineRow: { alignItems: 'flex-start', minHeight: 112 },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  multilineInput: { minHeight: 104, textAlignVertical: 'top' },
  toggle: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
