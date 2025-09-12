import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Ignorar warnings de APIs movidas fuera de react-native core
LogBox.ignoreLogs([
  'ProgressBarAndroid has been extracted',
  'Clipboard has been extracted',
  'PushNotificationIOS has been extracted',
  '`ImagePicker.MediaTypeOptions` have been deprecated',
]);

// Filtro adicional para que no se sature la consola en desarrollo
const IGNORED_PATTERNS = [
  /ProgressBarAndroid has been extracted/,
  /Clipboard has been extracted/,
  /PushNotificationIOS has been extracted/,
  /`ImagePicker.MediaTypeOptions` have been deprecated/,
];
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  try {
    const first = args[0];
    if (typeof first === 'string' && IGNORED_PATTERNS.some(r => r.test(first))) return;
  } catch {}
  originalWarn(...args);
};

// Tema central de la app
const theme = {
  ...MD3LightTheme,
  roundness: 10,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007bff',
    primaryContainer: '#e0f0ff',
    secondary: '#00bcd4',
    secondaryContainer: '#c9f6ff',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceVariant: '#f0f2f5',
    outline: '#d0d5db',
    outlineVariant: '#e4e7ec',
    onSurface: '#222222',
    onBackground: '#222222',
    error: '#d32f2f',
    tertiary: '#1b8f2d', // usar para estados "Vigente"
  },
};

export default function RootLayout() {
  useEffect(() => {}, []);
  const BottomBar = () => {
    const insets = useSafeAreaInsets();
    // Altura mínima para botones de navegación Android si inset es 0
    const h = Platform.OS === 'android' ? Math.max(insets.bottom, 18) : insets.bottom;
    if (h === 0) return null;
    return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, backgroundColor: '#000' }} />;
  };
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <PaperProvider theme={theme}>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
            <BottomBar />
          </View>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
