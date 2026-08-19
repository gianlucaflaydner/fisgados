import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDraft } from '@/stores/draft';

/**
 * Câmera abre direto, sem tela intermediária (PRD 6.1, passo 2).
 *
 * A foto é comprimida aqui, antes de qualquer coisa: o requisito não funcional é lado maior de
 * 1600 px e JPEG 80, e comprimir na hora do upload significaria carregar o original na memória
 * de novo, mais tarde, com o app já ocupado sincronizando.
 */
export default function Camera() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturando, setCapturando] = useState(false);
  const setDraft = useDraft((s) => s.set);

  if (!permissao) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo">
        <ActivityIndicator color="#35D6A4" />
      </View>
    );
  }

  if (!permissao.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo px-8">
        <Text className="text-center text-base text-texto">
          O Fisgados precisa da câmera para registrar a foto da captura.
        </Text>
        <Pressable
          onPress={pedirPermissao}
          className="mt-6 rounded-2xl bg-destaque px-6 py-3 active:opacity-80"
        >
          <Text className="font-bold text-fundo">Permitir câmera</Text>
        </Pressable>
      </View>
    );
  }

  async function tirarFoto() {
    if (capturando) return;
    setCapturando(true);
    try {
      const foto = await cameraRef.current?.takePictureAsync({ quality: 1, skipProcessing: true });
      if (!foto) return;

      const comprimida = await ImageManipulator.manipulateAsync(
        foto.uri,
        [{ resize: { width: foto.width >= foto.height ? 1600 : undefined, height: foto.height > foto.width ? 1600 : undefined } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      setDraft({ photoUri: comprimida.uri, caughtAt: new Date() });
      router.replace('/captura/detalhes');
    } finally {
      setCapturando(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View
        className="absolute inset-x-0 bottom-0 items-center pt-6"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Pressable
          onPress={tirarFoto}
          disabled={capturando}
          className="h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 active:opacity-70"
        >
          {capturando ? <ActivityIndicator color="#fff" /> : <View className="h-14 w-14 rounded-full bg-white" />}
        </Pressable>
      </View>
    </View>
  );
}
