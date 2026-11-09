import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Store identifiers: set ONCE and never change them after the first store build.
 * TODO(Davi): confirm the final value before the first EAS build.
 */
const BUNDLE_ID = 'cl.planya.app'

// Build-time values come from EAS environment variables (or app/.env locally).
const easProjectId = process.env.EAS_PROJECT_ID
const googleMapsAndroidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PlanYá',
  slug: 'planya',
  scheme: 'planya',
  // Marketing version. Build numbers are managed remotely by EAS (see eas.json).
  version: '1.0.0',
  orientation: 'portrait',
  // Light mode only in this version (tokens are semantic, so dark mode can come later).
  userInterfaceStyle: 'light',
  // Provisional PlanYá mark (mountains + sun). Swap these files if the client sends an official logo.
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#2E5A40',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // Only "while in use" location; never background location.
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    blockedPermissions: ['ACCESS_BACKGROUND_LOCATION', 'RECORD_AUDIO'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    // Maps: Google Maps on Android (key restricted to the package + signing SHA-1), Apple Maps on iOS.
    ['react-native-maps', googleMapsAndroidKey ? { androidGoogleMapsApiKey: googleMapsAndroidKey } : {}],
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAFAF9',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'PlanYá necesita acceso a tus fotos para que elijas tu foto de perfil y las fotos de tus planes.',
        cameraPermission:
          'PlanYá necesita acceso a la cámara para que tomes tu foto de perfil y fotos de tus planes.',
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'PlanYá usa tu ubicación mientras usas la app para mostrarte planes cercanos y el clima de tu zona.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // Read by the app: without a key, Android shows a static map instead of Google Maps.
    googleMapsConfigured: Boolean(googleMapsAndroidKey),
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
})
