/* Global Jest setup for the app (Reanimated 4 official Jest support). */
require('react-native-reanimated').setUpTests()
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'))
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)
