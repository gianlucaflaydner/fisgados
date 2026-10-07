import { useEffect } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { getAlbum, RARITY_LABEL, RARITY_POINTS, speciesOfAlbum, type Species } from '@/catalog';
import { getIlustracao } from '@/catalog/ilustracoes';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * A cena de desbloqueio — F07, o passo 7 do fluxo de registro.
 *
 * Era um `Alert` do sistema: a única recompensa de um app que se propõe a ser um álbum aparecia
 * como uma caixa cinza de sistema operacional, igual a um aviso de erro. Aqui ela vira a única
 * cena com animação do produto.
 *
 * **A animação é a cor voltando ao desenho.** A carta trancada do álbum é a silhueta da espécie —
 * a mesma ilustração pintada de uma cor só. Desbloquear é a cor preenchendo o contorno que já
 * estava lá. É por isso que não há partícula nem confete: o gesto já conta a história, e o peixe é
 * que é o assunto.
 *
 * O efeito é feito com duas cópias da ilustração sobrepostas — a silhueta embaixo, a colorida por
 * cima com opacidade animada. Cruzar opacidade é o que o Reanimated faz bem em qualquer versão;
 * animar um filtro recém-chegado ao React Native seria apostar.
 */
export function Desbloqueio({
  species,
  trofeu,
  onVerCarta,
  onFechar,
}: {
  species: Species;
  /** A captura que abriu a carta também bateu o critério de troféu (RN19)? */
  trofeu?: boolean;
  onVerCarta: () => void;
  onFechar: () => void;
}) {
  const paleta = useCores();
  const rar = coresDeRaridade(paleta)[species.rarity];
  const arte = getIlustracao(species.id);
  const semMovimento = useReducedMotion();

  const escala = useSharedValue(semMovimento ? 1 : 0.86);
  const cor = useSharedValue(semMovimento ? 1 : 0);
  const brilho = useSharedValue(semMovimento ? 0.35 : 0);

  useEffect(() => {
    if (semMovimento) return;
    // A carta assenta primeiro, e só então a cor chega. Invertido, a cor apareceria durante o
    // movimento e as duas coisas se atrapalhariam.
    escala.value = withSpring(1, { damping: 14, stiffness: 140 });
    cor.value = withDelay(260, withTiming(1, { duration: 950 }));
    brilho.value = withDelay(260, withTiming(0.35, { duration: 950 }));
  }, [semMovimento, escala, cor, brilho]);

  const estiloCarta = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const estiloCor = useAnimatedStyle(() => ({ opacity: cor.value }));
  const estiloBrilho = useAnimatedStyle(() => ({ opacity: brilho.value }));

  const { numero, total, albumNome } = posicaoNoAlbum(species);

  return (
    <Modal transparent animationType="fade" onRequestClose={onFechar} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/80 px-8">
        <Text
          className="mb-5 font-display text-[12px] uppercase tracking-[0.14em]"
          style={{ color: paleta.destaque }}
        >
          Nova no álbum
        </Text>

        <Animated.View style={estiloCarta}>
          {/* O brilho é da cor da raridade e mora atrás da carta: some junto se a cor não chegar. */}
          <Animated.View
            pointerEvents="none"
            style={[
              // Deslocamento negativo em estilo, não em classe: utilitário negativo do Tailwind é
              // exatamente o tipo de coisa que o NativeWind pode não mapear e falhar calado.
              { position: 'absolute', top: -24, right: -24, bottom: -24, left: -24 },
              { backgroundColor: rar, borderRadius: 32 },
              estiloBrilho,
            ]}
          />

          {/*
            A carta segue a proporção da ilustração (16:10), e não o 3:4 da foto da captura: o
            peixe é desenhado deitado, e numa carta alta ele ficaria pequeno no meio de duas faixas
            vazias — justamente no único momento em que ele deveria ser grande.
          */}
          <View
            className="w-60 overflow-hidden rounded-carta bg-superficie"
            style={{ borderWidth: 2, borderColor: rar }}
          >
            <View className="items-center justify-center bg-elevado" style={{ aspectRatio: 16 / 10 }}>
              {arte ? (
                <>
                  <Image
                    source={arte}
                    className="h-full w-full"
                    resizeMode="contain"
                    tintColor={paleta.borda}
                  />
                  <Animated.View className="absolute inset-0" style={estiloCor}>
                    <Image source={arte} className="h-full w-full" resizeMode="contain" />
                  </Animated.View>
                </>
              ) : null}
            </View>

            <View className="border-t border-borda bg-superficie px-2 py-1.5">
              <Text className="font-display text-[13px] text-texto" numberOfLines={1}>
                {species.commonName}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Text className="mt-6 text-center font-display text-[24px] tracking-[-0.02em] text-texto">
          {species.commonName} desbloqueado
        </Text>
        <Text className="mt-1 text-center font-cientifico text-[16px] text-suave">
          Carta {numero} de {total} · {albumNome}
        </Text>
        <Text className="mt-1 text-center text-sm" style={{ color: rar }}>
          {RARITY_LABEL[species.rarity]} — {RARITY_POINTS[species.rarity]} pontos de coleção
        </Text>

        {trofeu ? (
          <Text className="mt-3 text-center text-sm font-semibold" style={{ color: paleta.destaque }}>
            E ainda é exemplar de troféu.
          </Text>
        ) : null}

        <View className="mt-8 flex-row gap-2">
          <Pressable
            onPress={onVerCarta}
            className="rounded-2xl border border-borda px-5 py-3 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-texto">Ver carta</Text>
          </Pressable>
          <Pressable
            onPress={onFechar}
            className="rounded-2xl bg-destaque px-5 py-3 active:opacity-80"
          >
            <Text className="text-sm font-bold text-destaque-texto">Continuar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Onde a carta fica na grade.
 *
 * Uma espécie pode estar em dois álbuns — a traíra é carta de pesqueiro e de rio. Mostrar o
 * primeiro é escolha arbitrária, mas dizer "carta 12 de 23 em Pesqueiros do Sul" é mais concreto
 * do que "24 de 91", que é um número que ninguém consegue situar.
 */
function posicaoNoAlbum(species: Species): { numero: number; total: number; albumNome: string } {
  const albumId = species.albums[0];
  const album = albumId ? getAlbum(albumId) : undefined;
  const lista = albumId ? speciesOfAlbum(albumId) : [];
  const indice = lista.findIndex((s) => s.id === species.id);

  return {
    numero: indice >= 0 ? indice + 1 : 0,
    total: lista.length,
    albumNome: album?.name ?? 'catálogo',
  };
}
