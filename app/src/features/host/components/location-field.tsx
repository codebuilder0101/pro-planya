import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { LocationMap } from '@/components/map/location-map'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { FormMessage } from '@/components/ui/form-message'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { TextField } from '@/components/ui/text-field'
import { cityCenter, COMUNAS, getDevicePosition, type Coords } from '@/lib/location'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = {
  comuna: string
  onComunaChange: (comuna: string) => void
  location: Coords | null
  onLocationChange: (coords: Coords) => void
  comunaError?: string
  locationError?: string
}

/** Comuna (quick picks or free text) + meeting point chosen by tapping the map. */
export function LocationField({
  comuna,
  onComunaChange,
  location,
  onLocationChange,
  comunaError,
  locationError,
}: Props) {
  const [center, setCenter] = useState<Coords>(() => location ?? cityCenter(comuna))
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const pickComuna = (name: string) => {
    onComunaChange(name)
    setCenter(cityCenter(name))
  }

  const locateMe = async () => {
    setLocateError(null)
    setLocating(true)
    const position = await getDevicePosition()
    setLocating(false)
    if (!position) {
      setLocateError('No pudimos obtener tu ubicación. Revisa los permisos o marca el punto en el mapa.')
      return
    }
    setCenter(position)
    onLocationChange(position)
  }

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {COMUNAS.map((c) => (
          <Chip key={c} label={c} selected={comuna === c} onPress={() => pickComuna(c)} />
        ))}
      </ScrollView>
      <TextField
        label="Comuna"
        value={comuna}
        onChangeText={onComunaChange}
        error={comunaError}
        placeholder="Ej: Temuco"
        autoCapitalize="words"
        maxLength={60}
        testID="plan-comuna"
      />

      <View style={styles.mapHeader}>
        <Text variant="subhead" color="textSecondary">
          Punto de encuentro
        </Text>
        <Text variant="caption" color={location ? 'textBrand' : 'textSecondary'}>
          {location ? 'Marcado' : 'Toca el mapa para marcarlo'}
        </Text>
      </View>
      <View style={[styles.map, locationError && !location ? styles.mapError : null]}>
        <LocationMap value={location} center={center} onChange={onLocationChange} />
        {!location ? (
          <View style={styles.mapHint} pointerEvents="none">
            <Icon name="hand-left-outline" size={16} color="textPrimary" />
            <Text variant="captionStrong">Toca donde se juntan</Text>
          </View>
        ) : null}
      </View>
      <Button
        label="Usar mi ubicación actual"
        icon="navigate-outline"
        variant="ghost"
        size="md"
        fullWidth={false}
        loading={locating}
        onPress={() => void locateMe()}
      />
      <FormMessage tone="error" message={locateError ?? (location ? null : (locationError ?? null))} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  chipsScroll: { marginHorizontal: -spacing.lg },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  map: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  mapError: { borderColor: colors.danger },
  mapHint: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
  },
})
