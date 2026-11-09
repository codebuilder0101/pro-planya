/**
 * Image pipeline: pick (camera or gallery, asking permission only when needed),
 * compress to max ~1600 px JPEG, upload to Supabase Storage.
 */
import { randomUUID } from 'expo-crypto'
import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'

import { supabase } from './supabase'

export const MAX_IMAGE_SIDE = 1600
const JPEG_QUALITY = 0.72

export type ImageSource = 'camera' | 'library'

export type PickedImage = { uri: string; width: number; height: number }

export class PermissionDeniedError extends Error {
  constructor(public readonly source: ImageSource) {
    super(`permission_denied_${source}`)
    this.name = 'PermissionDeniedError'
  }
}

export function permissionDeniedMessage(source: ImageSource): string {
  return source === 'camera'
    ? 'Permite el acceso a la cámara en los ajustes de tu teléfono para tomar una foto.'
    : 'Permite el acceso a tus fotos en los ajustes de tu teléfono para elegir una imagen.'
}

/** Returns null if the user cancelled. Throws PermissionDeniedError if access was denied. */
export async function pickImage(
  source: ImageSource,
  options: { aspect?: [number, number]; allowsEditing?: boolean } = {},
): Promise<PickedImage | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) throw new PermissionDeniedError('camera')
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) throw new PermissionDeniedError('library')
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing ?? false,
    aspect: options.aspect,
    quality: 1,
    exif: false,
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions)

  if (result.canceled) return null
  const asset = result.assets[0]
  if (!asset) return null
  return { uri: asset.uri, width: asset.width, height: asset.height }
}

/** Several photos from the gallery (or one from the camera). Empty if the user cancelled. */
export async function pickImages(source: ImageSource, limit: number): Promise<PickedImage[]> {
  if (source === 'camera') {
    const one = await pickImage('camera')
    return one ? [one] : []
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new PermissionDeniedError('library')
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: Math.max(1, limit),
    orderedSelection: true,
    quality: 1,
    exif: false,
  })
  if (result.canceled) return []
  return result.assets.slice(0, limit).map((a) => ({ uri: a.uri, width: a.width, height: a.height }))
}

/** Downscales so the longest side is at most MAX_IMAGE_SIDE, and re-encodes as JPEG. */
export async function compressImage(image: PickedImage): Promise<PickedImage> {
  const context = ImageManipulator.manipulate(image.uri)
  const longest = Math.max(image.width, image.height)
  if (longest > MAX_IMAGE_SIDE) {
    if (image.width >= image.height) context.resize({ width: MAX_IMAGE_SIDE })
    else context.resize({ height: MAX_IMAGE_SIDE })
  }
  const rendered = await context.renderAsync()
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG })
  return { uri: saved.uri, width: saved.width, height: saved.height }
}

export type UploadedImage = { path: string; publicUrl: string }

/** Uploads a local image to `<bucket>/<folder>/<uuid>.jpg` and returns its public URL. */
export async function uploadImage(
  bucket: 'avatars' | 'experience-photos',
  folder: string,
  image: PickedImage,
): Promise<UploadedImage> {
  const path = `${folder}/${randomUUID()}.jpg`
  // Read the local file natively (reliable on Android and iOS) and send an ArrayBuffer.
  // Web (design previews) gets blob:/data: URIs, which fetch() can read.
  const body =
    Platform.OS === 'web'
      ? await (await fetch(image.uri)).arrayBuffer()
      : await new File(image.uri).arrayBuffer()
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

/** Extracts the object path from a public URL of the given bucket, or null. */
export function storagePathFromPublicUrl(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0] ?? '')
}
