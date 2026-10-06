import { Image, Pressable, Text, View } from 'react-native';

import { getSpecies } from '@/catalog';
import type { CatchRow } from '@/db/schema';
import { isTrophy, weightLabel } from '@/domain/weight';
import { Contador, Etiqueta, Gema, Selo } from './ui';
import { coresDeRaridade, useCores } from '@/theme';

/**
 * A captura como carta — o objeto central do app.
 *
 * A moldura é a cor da raridade, com 4 px de largura, e o conteúdo fica dentro dela: é a
 * figurinha colada no álbum, não um cartão com uma listinha. A foto ocupa a largura inteira, com
 * 150 px de altura — o conteúdo do app *é* a foto do peixe, e dar a ela menos espaço que isso
 * transforma o histórico numa planilha.
 *
 * A medida é o maior número da carta (34 px, display, tabular). É o dado que a pessoa levanta a
 * cabeça para conferir, e o que ela conta para os amigos.
 *
 * Cor nunca carrega informação sozinha: a moldura e a gema repetem a raridade, e o nome da
 * espécie, a medida e as etiquetas continuam escritos.
 */
export function CartaCaptura({
  row,
  recorde,
  quantas,
  onPress,
}: {
  row: CatchRow;
  /** Esta captura é a maior daquela espécie? Vem de `listPersonalBests`, não do que está na tela. */
  recorde?: boolean;
  quantas?: number;
  /** Abre a correção. Sem isto a carta é só leitura. */
  onPress?: () => void;
}) {
  const paleta = useCores();
  const cores = coresDeRaridade(paleta);

  const species = row.speciesId ? getSpecies(row.speciesId) : undefined;
  const moldura = species ? cores[species.rarity] : paleta.borda;
  const peso = weightLabel(row.weightG, row.weightEstG);
  const trofeu = species ? isTrophy(row.lengthCm, species) : false;

  const data = new Date(row.caughtAt);
  const quando = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${species ? species.commonName : 'Captura não identificada'}, ${formatarMedida(row.lengthCm)} cm`}
      className="mx-5 mt-3 rounded-[22px] p-1 active:opacity-90"
      style={{
        backgroundColor: moldura,
        // Carta é a única coisa do app com sombra: ela está colada *sobre* a página.
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      }}
    >
      <View className="overflow-hidden rounded-carta bg-superficie">
        <View className="h-[150px] w-full bg-elevado">
          <Image source={{ uri: row.photoLocal }} className="h-full w-full" resizeMode="cover" />

          {/* Um selo por carta. Troféu ganha de recorde: é o mais raro dos dois. */}
          {trofeu ? (
            <View className="absolute left-3 top-3">
              <Selo texto="TROFÉU" />
            </View>
          ) : recorde ? (
            <View className="absolute left-3 top-3">
              <Selo texto="RECORDE" tom="ouro" />
            </View>
          ) : null}

          {quantas && quantas > 1 ? (
            <View className="absolute bottom-2.5 right-2.5">
              <Contador texto={`${quantas}× fisgada`} />
            </View>
          ) : null}
        </View>

        <View className="gap-3 px-4 pb-4 pt-3.5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="shrink font-display text-[22px] text-texto" numberOfLines={1}>
                  {species ? species.commonName : 'Não identificado'}
                </Text>
                {species ? <Gema raridade={species.rarity} /> : null}
              </View>
              {species ? (
                <Text className="font-cientifico text-[16px] text-suave" numberOfLines={1}>
                  {species.scientificName}
                </Text>
              ) : null}
            </View>

            <View className="items-end">
              <Text
                className="font-display text-[34px] leading-[34px] tracking-[-0.02em] text-texto"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatarMedida(row.lengthCm)}
                <Text className="font-display-medio text-[16px] text-suave"> cm</Text>
              </Text>
              {peso ? <Text className="mt-1 font-corpo text-[12.5px] text-apoio">{peso}</Text> : null}
            </View>
          </View>

          <View className="flex-row flex-wrap items-center gap-1.5">
            {row.placeLabel ? <Etiqueta texto={row.placeLabel} icone="local" /> : null}
            <Etiqueta texto={`${quando} · ${hora}`} icone="relogio" />
            {row.released ? <Etiqueta texto="Solto" icone="soltar" tom="solto" /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Sem casas decimais quando é número redondo: "42 cm" e não "42,0 cm". */
function formatarMedida(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
