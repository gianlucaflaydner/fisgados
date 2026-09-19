import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  calcularRecorte,
  dimensoesAposGirar,
  escalaDeCobertura,
  ESCALA_MAX,
  PROPORCAO_CARTA,
  type Rotacao,
} from '@/domain/recorte';
import { finalizarFoto, fotoDaGaleria } from '@/media/photo';
import { useDraft } from '@/stores/draft';
import { useIdentificacao } from '@/stores/identificacao';

/**
 * Enquadramento — o passo entre a foto e o formulário.
 *
 * A máscara é 3:4 porque é a proporção da carta do álbum. Isso não é detalhe de implementação: a
 * pessoa não está recortando uma foto, está enquadrando a própria carta, e a legenda embaixo diz
 * isso com todas as letras. Sem este passo, o card cortava a foto pelo centro e o peixe saía pela
 * metade em toda captura tirada na horizontal.
 *
 * A imagem se move sob uma janela parada. É o inverso do que o código faz por dentro — lá o que
 * anda é o retângulo de recorte — mas é o que a mão espera: o dedo arrasta a foto.
 *
 * **Sempre dá para desistir da foto.** A câmera *substitui* a si mesma por esta tela, então o
 * "voltar" do sistema levaria para a home e jogaria o rascunho fora. Por isso a tela tem as
 * próprias saídas: voltar para escolher entre câmera e galeria, ou — quando a foto veio da
 * galeria — reabrir a galeria direto, que é o que quem escolheu a foto errada quer fazer.
 */
export default function Enquadrar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bruta = useDraft((s) => s.fotoBruta);
  const origem = useDraft((s) => s.origemFoto);
  const setDraft = useDraft((s) => s.set);

  const [area, setArea] = useState({ largura: 0, altura: 0 });
  const [rotacao, setRotacao] = useState<Rotacao>(0);
  const [salvando, setSalvando] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const ocupado = salvando || trocando;

  const escala = useSharedValue(1);
  const escalaSalva = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xSalvo = useSharedValue(0);
  const ySalvo = useSharedValue(0);

  const imagem = useMemo(
    () => dimensoesAposGirar({ largura: bruta?.largura ?? 0, altura: bruta?.altura ?? 0 }, rotacao),
    [bruta?.largura, bruta?.altura, rotacao],
  );

  /** A máscara: a maior 3:4 que cabe na área livre, com respiro nas bordas. */
  const janela = useMemo(() => {
    if (area.largura <= 0 || area.altura <= 0) return { largura: 0, altura: 0 };
    // Math.max contra tela estreita demais: sem isso a janela sai negativa e a tela trava no
    // indicador de carregando, sem nunca dizer por quê.
    const larguraMax = Math.max(0, area.largura - 48);
    const alturaMax = Math.max(0, area.altura - 48);
    const largura = Math.min(larguraMax, alturaMax * PROPORCAO_CARTA);
    return { largura, altura: largura / PROPORCAO_CARTA };
  }, [area]);

  const base = escalaDeCobertura(imagem, janela);
  const pronto = janela.largura > 0 && imagem.largura > 0;

  // Capturado como número para os worklets: o limite depende da escala do momento.
  const imgL = imagem.largura * base;
  const imgA = imagem.altura * base;
  const janL = janela.largura;
  const janA = janela.altura;

  function reposicionar() {
    escala.value = 1;
    escalaSalva.value = 1;
    x.value = 0;
    y.value = 0;
    xSalvo.value = 0;
    ySalvo.value = 0;
  }

  function girar() {
    setRotacao((r) => (((r + 90) % 360) as Rotacao));
    // Girar muda o que cabe na janela; manter o zoom antigo deixaria a foto fora de lugar.
    reposicionar();
  }

  /** Volta para a tela da câmera, onde dá para fotografar de novo ou abrir a galeria. */
  const voltar = useCallback(() => {
    if (ocupado) return;
    router.replace('/captura/camera');
  }, [ocupado, router]);

  /**
   * Reabre a galeria no lugar, sem sair desta tela.
   *
   * Fechar a galeria sem escolher mantém a foto atual — quem abriu só para conferir não pode
   * perder o que já tinha. Escolher outra zera giro e zoom, que valiam para a foto anterior.
   */
  async function escolherOutra() {
    if (ocupado) return;
    setTrocando(true);
    try {
      const foto = await fotoDaGaleria();
      if (!foto) return;

      setDraft({
        fotoBruta: { uri: foto.uri, largura: foto.largura, altura: foto.altura },
        origemFoto: 'galeria',
        caughtAt: foto.capturadaEm ?? new Date(),
      });
      setRotacao(0);
      reposicionar();
    } catch {
      Alert.alert('Não deu para abrir a galeria', 'Tente de novo ou volte e fotografe agora.');
    } finally {
      setTrocando(false);
    }
  }

  // O botão "voltar" do Android faz o mesmo que "Voltar" na tela. Sem isto, ele saltaria a
  // câmera — que foi substituída por esta tela — e cairia na home com o rascunho perdido.
  useFocusEffect(
    useCallback(() => {
      const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
        voltar();
        return true;
      });
      return () => inscricao.remove();
    }, [voltar]),
  );

  const pinca = Gesture.Pinch()
    .onUpdate((e) => {
      escala.value = Math.min(ESCALA_MAX, Math.max(1, escalaSalva.value * e.scale));
      // Ao afastar, o que sobrava de folga some: prende antes de aparecer buraco na janela.
      const folgaX = Math.max(0, (imgL * escala.value - janL) / 2);
      const folgaY = Math.max(0, (imgA * escala.value - janA) / 2);
      x.value = Math.min(folgaX, Math.max(-folgaX, x.value));
      y.value = Math.min(folgaY, Math.max(-folgaY, y.value));
    })
    .onEnd(() => {
      escalaSalva.value = escala.value;
      xSalvo.value = x.value;
      ySalvo.value = y.value;
    });

  const arrasto = Gesture.Pan()
    .onUpdate((e) => {
      const folgaX = Math.max(0, (imgL * escala.value - janL) / 2);
      const folgaY = Math.max(0, (imgA * escala.value - janA) / 2);
      x.value = Math.min(folgaX, Math.max(-folgaX, xSalvo.value + e.translationX));
      y.value = Math.min(folgaY, Math.max(-folgaY, ySalvo.value + e.translationY));
    })
    .onEnd(() => {
      xSalvo.value = x.value;
      ySalvo.value = y.value;
    });

  const estiloFoto = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: escala.value }],
  }));

  async function usar() {
    if (ocupado || !bruta || !pronto) return;
    setSalvando(true);
    try {
      const recorte = calcularRecorte({
        imagem,
        janela,
        escala: escala.value,
        deslocX: x.value,
        deslocY: y.value,
      });
      const uri = await finalizarFoto(bruta.uri, { rotacao, recorte });
      setDraft({ photoUri: uri });
      // A IA olha a foto já enquadrada — o peixe maior no quadro, sem o fundo que foi cortado —
      // e começa agora, para a sugestão chegar enquanto a pessoa digita a medida.
      useIdentificacao.getState().iniciar(uri);
      router.replace('/captura/detalhes');
    } finally {
      setSalvando(false);
    }
  }

  // Chegar aqui sem foto é bug de rota. Voltar é melhor que travar numa tela preta.
  if (!bruta) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Text className="text-center text-base text-white">Nenhuma foto para enquadrar.</Text>
        <Pressable onPress={() => router.back()} className="mt-6 px-6 py-3 active:opacity-70">
          <Text className="font-bold text-white">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  function medir(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setArea({ largura: width, altura: height });
  }

  return (
    <View className="flex-1 bg-black">
      <View
        className="flex-row items-center justify-between px-5 pb-2"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable
          onPress={voltar}
          disabled={ocupado}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Voltar para escolher outra foto"
          className="active:opacity-60"
        >
          <Text className="text-sm font-semibold text-white">‹ Voltar</Text>
        </Pressable>

        {origem === 'galeria' ? (
          <Pressable
            onPress={escolherOutra}
            disabled={ocupado}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Escolher outra foto da galeria"
            className="flex-row items-center active:opacity-60"
          >
            {trocando ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            <Text className="ml-2 text-sm font-semibold text-white">Escolher outra</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1" onLayout={medir}>
        {pronto ? (
          <GestureDetector gesture={Gesture.Simultaneous(pinca, arrasto)}>
            <View className="flex-1 items-center justify-center">
              <Animated.View style={[{ width: imgL, height: imgA, position: 'absolute' }, estiloFoto]}>
                <Image
                  source={{ uri: bruta.uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Animated.View>

              {/*
                A máscara é desenhada como quatro faixas escuras em volta da janela, e não como um
                buraco: o React Native não recorta furo em View, e sombra espalhada não existe aqui.
              */}
              <Faixa estilo={{ top: 0, left: 0, right: 0, height: (area.altura - janela.altura) / 2 }} />
              <Faixa estilo={{ bottom: 0, left: 0, right: 0, height: (area.altura - janela.altura) / 2 }} />
              <Faixa
                estilo={{
                  top: (area.altura - janela.altura) / 2,
                  left: 0,
                  width: (area.largura - janela.largura) / 2,
                  height: janela.altura,
                }}
              />
              <Faixa
                estilo={{
                  top: (area.altura - janela.altura) / 2,
                  right: 0,
                  width: (area.largura - janela.largura) / 2,
                  height: janela.altura,
                }}
              />

              <View
                pointerEvents="none"
                style={{ width: janela.largura, height: janela.altura }}
                className="rounded-md border-2 border-white/90"
              >
                {/* Terços: peixe na diagonal é o enquadramento que quase todo mundo quer. */}
                <View className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
                <View className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
                <View className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
                <View className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
              </View>
            </View>
          </GestureDetector>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FF6A3D" />
          </View>
        )}

        <Text className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/80">
          Assim a carta vai ficar
        </Text>
      </View>

      <View
        className="flex-row items-center justify-between px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable onPress={girar} disabled={ocupado} hitSlop={10} className="active:opacity-60">
          <Text className="text-sm font-semibold text-white">Girar</Text>
        </Pressable>

        <Pressable onPress={reposicionar} disabled={ocupado} hitSlop={10} className="active:opacity-60">
          <Text className="text-sm font-semibold text-white/60">Reenquadrar</Text>
        </Pressable>

        <Pressable
          onPress={usar}
          disabled={ocupado || !pronto}
          className="rounded-2xl bg-destaque px-6 py-3 active:opacity-80"
        >
          {salvando ? (
            <ActivityIndicator color="#0A1520" />
          ) : (
            <Text className="text-sm font-bold text-destaque-texto">Usar foto</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Faixa({ estilo }: { estilo: ViewStyle }) {
  return <View pointerEvents="none" style={[{ position: 'absolute' }, estilo]} className="bg-black/60" />;
}
