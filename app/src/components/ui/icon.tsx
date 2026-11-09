import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'

import { colors, type ColorToken } from '@/theme/tokens'

export type IconName = ComponentProps<typeof Ionicons>['name']

type Props = {
  name: IconName
  size?: number
  color?: ColorToken
  /** Raw color, only for data-driven colors (e.g. a category color from the database). */
  rawColor?: string
}

export function Icon({ name, size = 22, color = 'textPrimary', rawColor }: Props) {
  return <Ionicons name={name} size={size} color={rawColor ?? colors[color]} accessibilityElementsHidden />
}

/** Category icons come from the database as Ionicons names; fall back safely if unknown. */
export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name)
}
