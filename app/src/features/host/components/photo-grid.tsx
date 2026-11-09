import { randomUUID } from 'expo-crypto'
import { Image } from 'expo-image'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { FormMessage } from '@/components/ui/form-message'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { chooseImageSource } from '@/lib/dialogs'
import { toUserMessage } from '@/lib/errors'
import { PermissionDeniedError, permissionDeniedMessage, pickImages } from '@/lib/images'
import { colors, radius, spacing } from '@/theme/tokens'

import { MAX_PHOTOS, type FormPhoto } from '../plan-form'

const COLUMNS = 3

type Props = {
  photos: FormPhoto[]
  onChange: (photos: FormPhoto[]) => void
  error?: string
}

/** Up to 8 photos; the first one is the cover. Tap a photo to make it the cover. */
export function PhotoGrid({ photos, onChange, error }: Props) {
  const [width, setWidth] = useState(0)
  const [pickError, setPickError] = useState<string | null>(null)
  const size = width > 0 ? Math.floor((width - spacing.sm * (COLUMNS - 1)) / COLUMNS) : 0
  const room = MAX_PHOTOS - photos.length

  const add = async () => {
    setPickError(null)
    const source = await chooseImageSource('Agregar fotos')
    if (!source) return
    try {
      const picked = await pickImages(source, room)
      if (picked.length === 0) return
      onChange([...photos, ...picked.map((p) => ({ key: randomUUID(), ...p }))].slice(0, MAX_PHOTOS))
    } catch (e) {
      setPickError(
        e instanceof PermissionDeniedError
          ? permissionDeniedMessage(e.source)
          : toUserMessage(e, 'No pudimos abrir tus fotos. Inténtalo de nuevo.'),
      )
    }
  }

  const remove = (key: string) => onChange(photos.filter((p) => p.key !== key))
  const makeCover = (key: string) => {
    const photo = photos.find((p) => p.key === key)
    if (photo) onChange([photo, ...photos.filter((p) => p.key !== key)])
  }

  return (
    <View>
      <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {size > 0
          ? photos.map((p, i) => (
              <View key={p.key} style={{ width: size, height: size }}>
                <PressableScale
                  onPress={i === 0 ? undefined : () => makeCover(p.key)}
                  disabled={i === 0}
                  accessibilityRole="button"
                  accessibilityLabel={i === 0 ? `Foto ${i + 1}, portada` : `Foto ${i + 1}. Usar como portada`}
                  style={styles.tile}
                >
                  <Image source={{ uri: p.uri }} style={styles.image} contentFit="cover" transition={150} />
                  {i === 0 ? <Badge label="Portada" tone="dark" style={styles.cover} /> : null}
                </PressableScale>
                <IconButton
                  icon="close"
                  variant="glass"
                  size={28}
                  iconSize={16}
                  accessibilityLabel={`Quitar foto ${i + 1}`}
                  onPress={() => remove(p.key)}
                  style={styles.remove}
                />
              </View>
            ))
          : null}
        {size > 0 && room > 0 ? (
          <PressableScale
            onPress={() => void add()}
            accessibilityRole="button"
            accessibilityLabel={`Agregar fotos. ${photos.length} de ${MAX_PHOTOS}`}
            style={[styles.add, { width: size, height: size }, error ? styles.addError : null]}
            testID="plan-add-photos"
          >
            <Icon name="camera-outline" size={26} color="textBrand" />
            <Text variant="captionStrong" color="textBrand">
              Agregar
            </Text>
            <Text variant="caption" color="textSecondary">
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </PressableScale>
        ) : null}
      </View>
      <Text variant="caption" color="textSecondary" style={styles.hint}>
        {photos.length > 1
          ? 'La primera foto es la portada. Toca otra foto para usarla como portada.'
          : 'Sube fotos reales del lugar o de la actividad. La primera será la portada.'}
      </Text>
      <FormMessage tone="error" message={pickError ?? error ?? null} />
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flex: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  image: { flex: 1 },
  cover: { position: 'absolute', left: spacing.xs, bottom: spacing.xs },
  remove: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  addError: { borderColor: colors.danger },
  hint: { marginTop: spacing.sm },
})
