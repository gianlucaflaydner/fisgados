import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fotoDaGaleria } from '@/media/photo';
import { useDraft } from '@/stores/draft';
import { useCores } from '@/theme';

/**
 * Câmera abre direto, sem tela intermediária (PRD 6.1, passo 2).
 *
 * A galeria fica ao lado do botão de disparo, e não escondida atrás de um menu: peixe se
 * fotografa quando está na mão, e o app costuma ser aberto depois. Os dois caminhos terminam
 * igual — foto bruta no rascunho, e daí para o enquadramento, que é onde ela vira carta.
 */
export default function Camera() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ocupado, setOcupado] = useState(false);
  const setDraft = useDraft((s) => s.set);
  const cores = useCores();

  async function daGaleria() {
    if (ocupado) return;
    setOcupado(true);
    try {
      const foto = await fotoDaGaleria();
      if (!foto) return;

      setDraft({
        fotoBruta: { uri: foto.uri, largura: foto.largura, altura: foto.altura },
        origemFoto: 'galeria',
        // A data do EXIF é o dia da pescaria; sem ela, hoje é o melhor palpite disponível.
        caughtAt: foto.capturadaEm ?? new Date(),
      });
      router.replace('/captura/enquadrar');
    } catch {
      Alert.alert('Não deu para abrir a galeria', 'Tente de novo ou fotografe agora.');
    } finally {
      setOcupado(false);
    }
  }

  async function tirarFoto() {
    if (ocupado) return;
    setOcupado(true);
    try {
      const foto = await cameraRef.current?.takePictureAsync({ quality: 1, skipProcessing: true });
      if (!foto) return;

      setDraft({
        fotoBruta: { uri: foto.uri, largura: foto.width, altura: foto.height },
        origemFoto: 'camera',
        caughtAt: new Date(),
      });
      router.replace('/captura/enquadrar');
    } finally {
      setOcupado(false);
    }
  }

  if (!permissao) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo">
        <ActivityIndicator color={cores.destaque} />
      </View>
    );
  }

  /*
   * Câmera negada não é beco sem saída: a galeria é um caminho completo para registrar a captura,
   * e quem não quer dar acesso à câmera ainda consegue usar o app inteiro por ali.
   */
  if (!permissao.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo px-8">
        <Text className="text-center text-base text-texto">
          O Fisgados precisa da câmera para fotografar a captura agora.
        </Text>
        <Pressable
          onPress={pedirPermissao}
          className="mt-6 w-full items-center rounded-2xl bg-destaque px-6 py-3 active:opacity-80"
        >
          <Text className="font-bold text-destaque-texto">Permitir câmera</Text>
        </Pressable>
        <Pressable
          onPress={daGaleria}
          disabled={ocupado}
          className="mt-3 w-full items-center rounded-2xl border border-borda px-6 py-3 active:opacity-70"
        >
          <Text className="font-semibold text-texto">Escolher da galeria</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-8 pt-6"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Pressable
          onPress={daGaleria}
          disabled={ocupado}
          accessibilityLabel="Escolher foto da galeria"
          className="h-16 w-16 items-center justify-center rounded-2xl border border-white/40 bg-black/40 active:opacity-70"
        >
          <Text className="text-2xl">🖼️</Text>
          <Text className="mt-0.5 text-[10px] font-semibold text-white">Galeria</Text>
        </Pressable>

        <Pressable
          onPress={tirarFoto}
          disabled={ocupado}
          accessibilityLabel="Tirar foto"
          className="h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 active:opacity-70"
        >
          {ocupado ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="h-14 w-14 rounded-full bg-white" />
          )}
        </Pressable>

        {/* Espelha a largura do botão da galeria para o disparo ficar centralizado na tela. */}
        <View className="h-16 w-16" />
      </View>
    </View>
  );
}
