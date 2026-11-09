import { BlurView } from 'expo-blur'
import type { BottomTabBarProps } from 'expo-router/tabs'
import { Platform, StyleSheet, View } from 'react-native'

import { Icon, type IconName } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { colors, elevation, minTapTarget, radius, screenMargin, spacing } from '@/theme/tokens'

type TabMeta = { label: string; icon: IconName; iconActive: IconName; prominent?: boolean }

/** Tab metadata by route name (src/app/(app)/(tabs)/*). */
const TABS: Record<string, TabMeta> = {
  index: { label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  explore: { label: 'Explorar', icon: 'compass-outline', iconActive: 'compass' },
  publish: { label: 'Publicar', icon: 'add', iconActive: 'add', prominent: true },
  bookings: { label: 'Reservas', icon: 'calendar-outline', iconActive: 'calendar' },
  profile: { label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
}

export const TAB_BAR_HEIGHT = 64

/** Floating, translucent tab bar with a prominent center "Publicar" button. */
export function FloatingTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View style={[styles.bar, elevation[3]]} role="tablist">
        <View style={styles.background} pointerEvents="none">
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, styles.tint]} />
        </View>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name]
          if (!meta) return null
          const focused = index === state.index
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigateToTab(route.key)
          }
          const onLongPress = () => emitter.emit({ type: 'tabLongPress', target: route.key })

          if (meta.prominent) {
            return (
              <PressableScale
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                haptic
                accessibilityRole="tab"
                accessibilityLabel={meta.label}
                accessibilityState={{ selected: focused }}
                style={styles.item}
              >
                <View style={[styles.prominent, elevation[2]]}>
                  <Icon name={meta.icon} size={28} color="onPrimary" />
                </View>
              </PressableScale>
            )
          }

          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              scaleTo={0.92}
              accessibilityRole="tab"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              style={styles.item}
            >
              <Icon
                name={focused ? meta.iconActive : meta.icon}
                size={24}
                color={focused ? 'tabIconActive' : 'tabIconInactive'}
              />
              <Text variant="caption" color={focused ? 'tabIconActive' : 'tabIconInactive'} numberOfLines={1}>
                {meta.label}
              </Text>
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
            </PressableScale>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: screenMargin,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xxl,
  },
  // Clips the blur to the rounded shape without clipping the bar's shadow.
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tabBarBorder,
  },
  tint: {
    backgroundColor: Platform.OS === 'ios' ? colors.tabBarBackground : colors.tabBarBackgroundOpaque,
  },
  item: {
    flex: 1,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  indicator: { width: 18, height: 3, borderRadius: radius.pill, marginTop: 1 },
  indicatorActive: { backgroundColor: colors.tabIconActive },
  prominent: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
