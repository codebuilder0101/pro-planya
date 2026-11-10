import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { MAX_REVIEW_COMMENT, RATING_LABELS, useCreateReview } from '@/features/reviews/api'
import { StarInput } from '@/features/reviews/star-input'
import { dbErrorCode, toUserMessage } from '@/lib/errors'
import { colors, screenMargin, spacing } from '@/theme/tokens'

/** Bottom sheet: rate a plan you joined, after it ended (once per plan). */
export default function ReviewSheet() {
  const insets = useSafeAreaInsets()
  const { experienceId = '', title = '' } = useLocalSearchParams<{ experienceId: string; title: string }>()
  const create = useCreateReview()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (rating === 0) {
      setError('Elige de 1 a 5 estrellas.')
      return
    }
    setError(null)
    try {
      await create.mutateAsync({ experienceId, rating, comment })
      setSent(true)
    } catch (e) {
      setError(
        dbErrorCode(e) === '23505'
          ? 'Ya calificaste este plan.'
          : toUserMessage(e, 'No pudimos publicar tu reseña. Inténtalo de nuevo.'),
      )
    }
  }

  if (sent) {
    return (
      <View style={[styles.done, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.doneIcon}>
          <Icon name="star" size={36} color="onPrimary" />
        </View>
        <Text variant="title2" align="center">
          ¡Gracias por tu reseña!
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          Tu opinión ayuda a otras personas a elegir planes y al anfitrión a mejorar.
        </Text>
        <Button label="Listo" onPress={() => router.back()} testID="review-done" />
      </View>
    )
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing.xl}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.header}>
        <Text variant="title2" accessibilityRole="header">
          ¿Cómo estuvo el plan?
        </Text>
        {title ? (
          <Text variant="body" color="textSecondary" numberOfLines={2}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.stars}>
        <StarInput
          value={rating}
          onChange={(n) => {
            setRating(n)
            setError(null)
          }}
        />
        <Text variant="bodyStrong" color={rating ? 'textPrimary' : 'textTertiary'} align="center">
          {rating ? RATING_LABELS[rating - 1] : 'Toca una estrella'}
        </Text>
      </View>

      <TextField
        label="Comentario (opcional)"
        value={comment}
        onChangeText={setComment}
        placeholder="¿Qué te gustó? ¿Qué se podría mejorar?"
        multiline
        maxLength={MAX_REVIEW_COMMENT}
        hint={`${comment.length}/${MAX_REVIEW_COMMENT}`}
        testID="review-comment"
      />

      <Text variant="footnote" color="textSecondary">
        Tu reseña será pública con tu nombre y no se puede editar.
      </Text>

      <FormMessage tone="error" message={error} />
      <Button
        label="Publicar reseña"
        icon="star-outline"
        onPress={() => void submit()}
        loading={create.isPending}
        disabled={!experienceId}
        testID="review-submit"
      />
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: screenMargin, paddingTop: spacing.xl },
  header: { gap: spacing.xs },
  stars: { gap: spacing.sm, paddingVertical: spacing.sm },
  done: { gap: spacing.md, paddingHorizontal: screenMargin, paddingTop: spacing.xl, alignItems: 'stretch' },
  doneIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.rating,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
