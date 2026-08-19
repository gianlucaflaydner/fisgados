import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/global.css';
import { db } from '@/db';
import migrations from '@/db/migrations/migrations';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  // Migration é pré-condição, não detalhe: abrir o app com schema errado é como se perde dado.
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo px-8">
        <Text className="mb-2 text-lg font-semibold text-perigo">Erro ao preparar o banco</Text>
        <Text className="text-center text-sm text-suave">{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo">
        <ActivityIndicator color="#35D6A4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0B1F1A' },
          headerTintColor: '#E8F0ED',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#0B1F1A' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Fisgados' }} />
        <Stack.Screen name="captura/camera" options={{ title: 'Foto da captura' }} />
        <Stack.Screen name="captura/detalhes" options={{ title: 'Registrar captura' }} />
        <Stack.Screen
          name="captura/especie"
          options={{ title: 'Qual espécie?', presentation: 'modal' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
